// pose-detection.js

const poseDetection = window.poseDetection;

let detector = null;
let video = null;
const debugLog = document.getElementById("debugLog");

async function initPoseDetection() {
    await tf.setBackend('webgl');
    detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);
    debugLog.innerText = "✅ Detector ready. Accessing camera...";

    video = document.createElement("video");
    video.style.display = "none";
    document.body.appendChild(video);

    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;
    await video.play();

    debugLog.innerText = "🎥 Camera ready. Detecting pose...";
    detectPose();
}

async function detectPose() {
    if (!detector || !video) return;

    const poses = await detector.estimatePoses(video);
    if (poses.length > 0) {
        const keypoints = poses[0].keypoints;
        const leftAnkle = keypoints.find(k => k.name === "left_ankle");
        const rightAnkle = keypoints.find(k => k.name === "right_ankle");

        if (leftAnkle && leftAnkle.score > 0.5) sendToUnity(leftAnkle.x, leftAnkle.y, "LeftAnkle");
        if (rightAnkle && rightAnkle.score > 0.5) sendToUnity(rightAnkle.x, rightAnkle.y, "RightAnkle");
    }

    requestAnimationFrame(detectPose);
}

function sendToUnity(x, y, label) {
    const data = JSON.stringify({ x, y, label });
    if (window.unityInstance) {
        window.unityInstance.SendMessage("KeypointReceiver", "OnKeypointsReceived", data);
        debugLog.innerText = `📤 Sent ${label}: (${x.toFixed(1)}, ${y.toFixed(1)})`;
    } else {
        debugLog.innerText = `⚠️ Waiting for Unity...`;
    }
}

// Called by Unity after WebGL is ready
window.RegisterUnityInstance = function (instance) {
    window.unityInstance = instance;
    initPoseDetection();
};
