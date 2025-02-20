import React, { useState, useEffect } from "react";
import { auth, database } from "../firebase";
import { ref, onValue, update } from "firebase/database";
import { useNavigate, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import Swal from "sweetalert2";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase"; // Import Firebase Storage
import "bootstrap/dist/css/bootstrap.min.css"; // Import Bootstrap CSS

const Profile = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");
  const [photoFile, setPhotoFile] = useState(null);

  // Load the current user's profile data
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      navigate("/auth"); // Redirect to login if the user is not authenticated
      return;
    }

    const userRef = ref(database, `users/${userId}/profile`);
    onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setName(data.name || "");
        setPhoto(data.photo || "images/default-profile.png"); // Default image from public folder
      }
    });
  }, [navigate]);

  // Handle profile update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const userId = auth.currentUser?.uid;

    if (!userId) return;

    try {
      let photoUrl = photo;

      // Upload the new photo if a file is selected
      if (photoFile) {
        const fileRef = storageRef(storage, `profile-photos/${userId}/${photoFile.name}`);
        await uploadBytes(fileRef, photoFile); // Upload the file to Firebase Storage
        photoUrl = await getDownloadURL(fileRef); // Get the download URL
      }

      // Update the profile in Firebase Realtime Database
      const userRef = ref(database, `users/${userId}/profile`);
      await update(userRef, {
        name: name,
        photo: photoUrl, // Save the download URL
      });

      Swal.fire({
        icon: "success",
        title: "Profile Updated!",
        text: "Your profile has been updated successfully.",
        confirmButtonText: "OK",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: error.message,
      });
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/signup");
  };

  return (
    <div className="container-fluid">
      <div className="row">
        {/* Sidebar */}
        <div className="col-md-3 bg-light p-4 vh-100 shadow">
          <h2 className="mb-4">Menu</h2>
          <ul className="list-unstyled">
            <li className="mb-3">
              <a href="/dashboard" className="text-decoration-none text-dark d-flex align-items-center">
                <i className="bi bi-house me-2"></i> Home
              </a>
            </li>
            <li className="mb-3">
              <p className="text-decoration-none text-dark d-flex align-items-center">
                <i className="bi bi-person me-2"></i><Link to="/profile">Profile</Link>
              </p>
            </li>
            <li className="mb-3">
              <a href="/badges" className="text-decoration-none text-dark d-flex align-items-center">
                <i className="bi bi-award me-2"></i> Badges
              </a>
            </li>
            <li className="mb-3">
              <button onClick={handleLogout} className="btn btn-link text-decoration-none text-dark d-flex align-items-center w-100 text-start">
                <i className="bi bi-box-arrow-right me-2"></i> Logout
              </button>
            </li>
          </ul>
        </div>

        {/* Main Content */}
        <div className="col-md-9 p-4">
          <div className="row justify-content-center">
            <div className="col-md-6">
              <div className="card shadow">
                <div className="card-body">
                  <h2 className="card-title text-center mb-4">Update Profile</h2>
                  <form onSubmit={handleUpdateProfile}>
                    <div className="mb-3">
                      <label htmlFor="name" className="form-label">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        className="form-control"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="photo" className="form-label">
                        Profile Photo
                      </label>
                      <input
                        type="file"
                        id="photo"
                        className="form-control"
                        accept="image/*"
                        onChange={(e) => setPhotoFile(e.target.files[0])}
                      />
                    </div>
                    <div className="text-center">
                      <button type="submit" className="btn btn-primary">
                        Update Profile
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;