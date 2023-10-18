const express = require("express");
const app = express();
const port = 3000;
const admin = require("firebase-admin");

const passwordHash = require("password-hash"); 
const serviceAccount = require("./sak.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const db = admin.firestore();
app.set("view engine", "ejs");

app.use((req, res, next) => {
  req.user = null;
  next();
});


app.get("/", function (req, res) {
  res.render("home");
});

app.get("/home", function (req, res) {
    res.render("home");
  });
  


app.get("/alumni", function (req, res) {
  db.collection("alumni")
    .get()
    .then((querySnapshot) => {
      const alumniData = [];
      querySnapshot.forEach((doc) => {
        alumniData.push(doc.data());
      });

      res.render("alumni", { alumniData });
    })
    .catch((error) => {
      console.error("Error fetching alumni data: ", error);
      res.status(500).send("An error occurred while fetching alumni data from the database.");
    });
});

app.get("/students", function (req, res) {
  db.collection("students")
    .get()
    .then((querySnapshot) => {
      const studentsData = [];
      querySnapshot.forEach((doc) => {
        studentsData.push(doc.data());
      });
      res.render("students", { studentsData });
    })
    .catch((error) => {
      console.error("Error fetching student data: ", error);
      res.status(500).send("An error occurred while fetching student data from the database.");
    });
});


app.get("/login", function (req, res) {
  res.render("login");
});

app.post("/loginsubmit", function (req, res) {


  const userEmail = req.body.Email;
  const userPassword = req.body.Password;

  if (userEmail && userPassword) {
    const studentQuery = db.collection("students").where("Email", "==", userEmail).get();
    const alumniQuery = db.collection("alumni").where("Email", "==", userEmail).get();

    Promise.all([studentQuery, alumniQuery])
      .then((results) => {
        const studentDocs = results[0].docs;
        const alumniDocs = results[1].docs;

        let userData = null;

        studentDocs.forEach((doc) => {
          const storedPassword = doc.data().Password;

          if (passwordHash.verify(userPassword, storedPassword)) {
            // Passwords match; store the user data
            userData = doc.data();
          }
        });

        // If the user data was not found in the students collection, check the alumni collection
        if (!userData) {
          alumniDocs.forEach((doc) => {
            const storedPassword = doc.data().Password;

            if (passwordHash.verify(userPassword, storedPassword)) {
              // Passwords match; store the user data
              userData = doc.data();
            }
          });
        }

        if (userData) {
          console.log("User data:", userData);
          res.render("home"); // Render the home page or handle the logged-in user as needed.
        } else {
          res.render("loginerror"); // Passwords don't match; handle the login failure.
        }
      })
      .catch((error) => {
        console.error("Firestore query error: ", error);
        // Handle the error
        res.status(500).send("An error occurred while querying the database.");
      });
  } else {
    // Handle the case where req.body.email or req.body.password is undefined
    res.status(400).send("Invalid email or password provided");
  }
});

app.get("/register", function (req, res) {
  res.render("register");
});


app.post("/submit", async function (req, res) {
  const userEmail = req.body.email;
  const userRole = req.body.role;

  if (userEmail && userRole) {

    const collectionName = userRole === "student" ? "students" : "alumni";


    const userRef = db.collection(collectionName).where("Email", "==", userEmail).get();

    userRef
      .then((querySnapshot) => {
        if (querySnapshot.docs.length > 0) {
          res.sendFile(__dirname + "/public/" + "error.html");
        } else {
          const hashedPassword = passwordHash.generate(req.body.password); 

          db.collection(collectionName)
            .add({
              Fullname: req.body.fullname,
              Email: req.body.email,
              Contact: req.body.contact,
              Designation: req.body.designation,
              Password: hashedPassword,
            })
            .then(() => {
              res.render("attempt");
            })
            .catch((error) => {
              console.error("Error adding user data: ", error);
              res.status(500).send("An error occurred while adding user data to the database.");
            });
        }
      })
      .catch((error) => {
        console.error("Firestore query error: ", error);
        res.status(500).send("An error occurred while querying the database.");
      });
  } else {
    res.status(400).send("Invalid email or role provided");
  }
});

// Start the server
app.listen(3000);
console.log("Server is running on port 3000");
