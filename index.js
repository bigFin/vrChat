import { FilesetResolver, FaceLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.js';

const videoElement = document.getElementById('video');
const canvasElement = document.querySelector('canvas');
const canvasCtx = canvasElement.getContext('2d');
const SPINNER = document.querySelector('.loading');

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
let runningMode = 'VIDEO';
let enableWebcam = true;

async function createFaceLandmarker() {
	const vision = await FilesetResolver.forVisionTasks(
		'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
	);
	faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
		baseOptions: {
			modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
			delegate: 'GPU',
		},
		runningMode,
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
		if (results.faceLandmarks) {
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
}

initialize();
