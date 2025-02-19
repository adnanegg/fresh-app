import React, { useState, useEffect } from "react";
import { auth, database } from "../firebase";
import { ref,onValue, update } from "firebase/database";
import { useNavigate } from "react-router-dom";
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
        setPhoto(data.photo || "assets/default-profile.png");
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
            await uploadBytes(fileRef, photoFile);
            photoUrl = await getDownloadURL(fileRef);
        }

      // Update the profile in Firebase Realtime Database
      const userRef = ref(database, `users/${userId}/profile`);
      await update(userRef, {
        name: name,
        photo: photoUrl,
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

  return (
    <div className="container mt-5">
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
  );
};

export default Profile;