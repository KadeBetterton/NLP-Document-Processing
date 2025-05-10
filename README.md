# NLP-Document-Processing
A web based application that utilizes NLP to cluster input documents based on term frequency, and builds an MDS plot for visualization.

Structure:
├── Index.html           # Frontend HTML interface
├── styles.css           # Styling for interface and MDS viewer
├── script.js            # Handles clustering logic, drag/drop UI, D3 plot, AJAX
├── NLP_Clustering.py    # Flask backend with clustering and MDS computation
├── run_project.py       # Launch script to start server and open UI
├── Dataset.zip          # Dataset of txt files used for testing
└── README.md            # You're here

Dependencies: 
pip install flask scikit-learn numpy
Launch application:
python run_project.py
