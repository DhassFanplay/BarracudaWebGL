const poseDetection = window.poseDetection;

let detector = null;
let video = null;
let debugLog = null;

async function initPoseDetection() {
    debugLog = document.getElementById("debugLog");
    if (!debugLog) {
        console.warn("❌ debugLog element not found in DOM.");
    }

    try {
        logDebug("⚙️ Initializing TensorFlow backend...");
        await tf.setBackend('webgl');

        logDebug("🔍 Loading MoveNet pose detector...");
        detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);
        logDebug("✅ Detector ready. Accessing camera...");

        video = document.createElement("video");
        video.style.display = "none";
        document.body.appendChild(video);

        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });
        video.srcObject = stream;
        await video.play();

        logDebug("🎥 Camera ready. Starting hand detection...");
        detectPose();
    } catch (err) {
        console.error("❌ Pose detection initialization failed:", err);
        logDebug(`❌ Error: ${err.message}`);
    }
}

async function detectPose() {
    if (!detector || !video) return;

    const poses = await detector.estimatePoses(video);
    if (poses.length > 0) {
        const keypoints = poses[0].keypoints;

        const leftWrist = keypoints.find(k => k.name === "left_wrist");
        const rightWrist = keypoints.find(k => k.name === "right_wrist");

        if (leftWrist && leftWrist.score > 0.5) {
            logDebug(`🖐️ LeftWrist: (${leftWrist.x.toFixed(1)}, ${leftWrist.y.toFixed(1)})`);
            sendToUnity(leftWrist.x, leftWrist.y, "LeftWrist");
        }

        if (rightWrist && rightWrist.score > 0.5) {
            logDebug(`🖐️ RightWrist: (${rightWrist.x.toFixed(1)}, ${rightWrist.y.toFixed(1)})`);
            sendToUnity(rightWrist.x, rightWrist.y, "RightWrist");
        }

        if (
            (!leftWrist || leftWrist.score <= 0.5) &&
            (!rightWrist || rightWrist.score <= 0.5)
        ) {
            logDebug("❌ No confident wrist keypoints detected.");
        }
    } else {
        logDebug("👀 No poses detected.");
    }

    requestAnimationFrame(detectPose);
}

function sendToUnity(x, y, label) {
    const data = JSON.stringify({ x, y, label });
    if (window.unityInstance) {
        window.unityInstance.SendMessage("KeypointReceiver", "OnKeypointsReceived", data);
        console.log(`📤 Sent to Unity: ${label} (${x.toFixed(1)}, ${y.toFixed(1)})`);
        logDebug(`📤 Sent to Unity: ${label} (${x.toFixed(1)}, ${y.toFixed(1)})`);
    } else {
        console.warn(`⚠️ Unity instance not ready. Skipping send for ${label}`);
        logDebug(`⚠️ Unity not ready. Skipped ${label}`);
    }
}

function logDebug(message) {
    if (debugLog) debugLog.innerText = message;
    console.log(message);
}

// Called by Unity after WebGL is ready
window.RegisterUnityInstance = function (instance) {
    window.unityInstance = instance;
    initPoseDetection();
};
