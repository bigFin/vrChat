import cv2
import subprocess
import os
import sys
import glob


def find_vrm_in_directory(directory="./"):
    """Find the first .vrm file in the specified directory."""
    vrm_files = glob.glob(os.path.join(directory, "*.vrm"))
    if vrm_files:
        return vrm_files[0]
    return None


def main(vrm_file=None, webcam_index=0, virtual_cam_device="/dev/video10"):
    # If no .vrm file is provided, search for one in the current directory
    if vrm_file is None:
        vrm_file = find_vrm_in_directory()
        if vrm_file is None:
            print("No VRM file found in the current directory.")
            return

    print(f"Using VRM file: {vrm_file}")

    # Initialize webcam capture
    cap = cv2.VideoCapture(webcam_index)

    # Check if webcam is opened successfully
    if not cap.isOpened():
        print(f"Error: Could not open webcam at index {webcam_index}.")
        return

    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Set up ffmpeg to pipe video to the virtual webcam
    ffmpeg_command = [
        'ffmpeg',
        '-f', 'rawvideo',
        '-pix_fmt', 'bgr24',
        '-s', f'{frame_width}x{frame_height}',
        '-r', '30',
        '-i', '-',
        '-f', 'v4l2',
        virtual_cam_device
    ]

    ffmpeg_process = subprocess.Popen(ffmpeg_command, stdin=subprocess.PIPE)

    try:
        while True:
            # Capture frame from webcam
            ret, frame = cap.read()
            if not ret:
                print("Failed to capture frame, exiting.")
                break

            # You can integrate rendering using Virtual Motion Capture here

            # Write the frame to ffmpeg for piping to the virtual webcam
            ffmpeg_process.stdin.write(frame.tobytes())

            # Display the frame for debugging (optional)
            cv2.imshow('Webcam Feed', frame)

            # Exit loop if 'q' is pressed
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    except KeyboardInterrupt:
        print("Exiting...")

    finally:
        # Clean up resources
        cap.release()
        ffmpeg_process.stdin.close()
        ffmpeg_process.wait()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(
        description="Webcam to VRM avatar virtual webcam.")
    parser.add_argument("--vrm", type=str, help="Path to a VRM file.")
    parser.add_argument("--webcam", type=int, default=0,
                        help="Webcam index (default: 0).")
    parser.add_argument("--virtual_cam", type=str, default="/dev/video10",
                        help="Virtual camera device (default: /dev/video10).")

    args = parser.parse_args()

    # Call main with the arguments
    main(vrm_file=args.vrm, webcam_index=args.webcam,
         virtual_cam_device=args.virtual_cam)
