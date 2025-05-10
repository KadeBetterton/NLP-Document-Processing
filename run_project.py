import webbrowser
import subprocess
import time

# Start Flask server
flask_process = subprocess.Popen(["python", "NLP_Clustering.py"])

time.sleep(2)

# Open frontend in browser
webbrowser.open("Index.html")

try:
    flask_process.wait()
except KeyboardInterrupt:
    print("Shutting down Flask...")
    flask_process.terminate()
