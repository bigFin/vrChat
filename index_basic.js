import { FilesetResolver, FaceLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.js';

const videoElement = document.getElementById('video');
const canvasElement = document.querySelector('canvas');
const canvasCtx = canvasElement.getContext('2d');
const SPINNER = document.querySelector('.loading');

// Three.js related variables
let avatarHead, avatarEyes, scene, camera, renderer;

// Initialize the Three.js scene and load the VRM avatar
function initThreeJS() {
	const container = document.getElementById('avatar_container');

	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
	renderer = new THREE.WebGLRenderer({ alpha: true });
	renderer.setSize(window.innerWidth, window.innerHeight);
	container.appendChild(renderer.domElement);

	// Load the VRM avatar
	const loader = new THREE.VRMLoader();
	loader.load('./avatar.vrm', function(vrm) {
		scene.add(vrm.scene);
		avatarHead = vrm.scene.getObjectByName('Head');  // Assume the VRM model has a "Head" bone
		avatarEyes = vrm.scene.getObjectByName('Eyes');  // Assume the VRM model has an "Eyes" bone
	});

	camera.position.z = 3;
	animate();
}

// Animate the Three.js scene (render loop)
function animate() {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
}

// Update the avatar based on facial landmarks
function updateAvatar(landmarks) {
	if (!avatarHead || !landmarks) return;

	// Example: Use the nose and eyes landmarks to control head and eye movements
	const nose = landmarks[1];  // Nose landmark
	const leftEye = landmarks[33];  // Left eye landmark
	const rightEye = landmarks[263];  // Right eye landmark

	// Control head rotation based on nose position
	avatarHead.rotation.x = (nose.y - 0.5) * Math.PI;  // Vertical rotation (up/down)
	avatarHead.rotation.y = (nose.x - 0.5) * Math.PI;  // Horizontal rotation (left/right)

	// Control eye rotation based on eye position
	avatarEyes.rotation.x = (leftEye.y - rightEye.y) * Math.PI;
	avatarEyes.rotation.y = (leftEye.x - rightEye.x) * Math.PI;
}

// Start webcam feed
async function initCamera() {
	const stream = await navigator.mediaDevices.getUserMedia({
		video: {
			width: 1280,
			height: 720,
		},
	});
	videoElement.srcObject = stream;

	return new Promise((resolve) => {
		videoElement.onloadedmetadata = () => {
			resolve(videoElement);
		};
	});
}

let faceLandmarker;
let enableWebcam = true;

async function createFaceLandmarker() {
	const vision = await FilesetResolver.forVisionTasks(
		'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
	);
	faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
		baseOptions: {
			modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
			delegate: 'CPU',
		},
		runningMode: 'VIDEO',
		numFaces: 1,
	});
}

async function predictLandmarks() {
	canvasElement.width = videoElement.videoWidth;
	canvasElement.height = videoElement.videoHeight;

	function onResults(results) {
		canvasCtx.save();
		canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
		canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
		if (results.faceLandmarks && results.faceLandmarks.length > 0) {
			// Draw landmarks on the canvas
			for (const landmarks of results.faceLandmarks) {
				for (const landmark of landmarks) {
					canvasCtx.beginPath();
					canvasCtx.arc(
						landmark.x * canvasElement.width,
						landmark.y * canvasElement.height,
						5,
						0,
						2 * Math.PI
					);
					canvasCtx.fillStyle = 'red';
					canvasCtx.fill();
				}
			}
			// Pass the landmarks to the Three.js avatar
			updateAvatar(results.faceLandmarks[0]);
		}
		canvasCtx.restore();
	}

	SPINNER.classList.add('hidden');
	const callback = async () => {
		const results = await faceLandmarker.detectForVideo(videoElement, performance.now());
		onResults(results);
		if (enableWebcam) {
			window.requestAnimationFrame(callback);
		}
	};
	callback();
}

async function initialize() {
	await initCamera();
	await createFaceLandmarker();
	predictLandmarks();
	initThreeJS();
}

initialize();
