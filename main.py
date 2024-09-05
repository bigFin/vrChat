import cv2
import mediapipe as mp
import subprocess
import os
import asyncio
import websockets
import json
import threading
import time
import http.server
import socketserver

# Initialize MediaPipe Face Landmarker using the latest API
mp_face_landmarker = mp.tasks.vision.FaceLandmarker
BaseOptions = mp.tasks.BaseOptions
VisionTaskOptions = mp.tasks.vision.VisionTaskOptions
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode


def initialize_face_landmarker():
    options = FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path="face_landmarker.task"),
        running_mode=VisionRunningMode.VIDEO,
        num_faces=1  # Detect only 1 face for simplicity
    )
    return mp_face_landmarker.create_from_options(options)


face_landmarker = initialize_face_landmarker()

# Start the HTTP server in the same script


def start_http_server():
    handler = http.server.SimpleHTTPRequestHandler
    httpd = socketserver.TCPServer(("", 8000), handler)
    print("Serving HTTP on port 8000...")
    httpd.serve_forever()

# Launch Puppeteer for Three.js rendering


def launch_puppeteer():
    command = ["node", "launch_browser.js"]
    return subprocess.Popen(command)

# Start wf-recorder for browser window capture


def start_wf_recorder(output_file="/tmp/avatar_feed.mp4"):
    if os.path.exists(output_file):
        os.remove(output_file)

    # Adjust window size and position to fit the actual window
    command = ["wf-recorder", "-g", "100,100 1280x720", "-f", output_file]
    return subprocess.Popen(command)

# Extract facial landmarks using the new MediaPipe Face Landmarker API


def get_facial_landmarks(image):
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # Create a MediaPipe Image object from the OpenCV frame
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)

    # Process the frame to get facial landmarks
    result = face_landmarker.detect_for_video(mp_image, time.time())
    if result.face_landmarks:
        landmarks = result.face_landmarks[0]
        # Normalized landmarks (x, y, z)
        return [(lm.x, lm.y, lm.z) for lm in landmarks]
    return None

# Send landmarks via WebSocket


async def send_landmarks(websocket):
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Failed to capture frame.")
                break

            # Get facial landmarks using the new API
            landmarks = get_facial_landmarks(frame)
            if landmarks:
                await websocket.send(json.dumps(landmarks))

            # Show the webcam feed in a window for debugging
            cv2.imshow("Webcam Feed", frame)

            # Handle 'q' to quit the window
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    except Exception as e:
        print(f"Error: {e}")

    finally:
        cap.release()
        cv2.destroyAllWindows()

# Main async loop


async def main():
    # Start HTTP server in a separate thread
    http_thread = threading.Thread(target=start_http_server, daemon=True)
    http_thread.start()

    # Give the server a second to start
    time.sleep(1)

    # Launch Puppeteer to open the Three.js avatar
    puppeteer_process = launch_puppeteer()

    # Start wf-recorder for browser capture
    recorder_process = start_wf_recorder()

    # Set up WebSocket to send facial landmarks to the Three.js app
    async with websockets.serve(send_landmarks, "localhost", 8765):
        await asyncio.Future()  # Run forever

    # Clean up processes on exit
    puppeteer_process.terminate()
    recorder_process.terminate()

# Run the WebSocket server and everything else
if __name__ == "__main__":
    asyncio.run(main())
