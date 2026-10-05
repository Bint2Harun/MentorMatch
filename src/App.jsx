import MentorDashboard from "./pages/MentorDashboard";
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import FaqPage from "./pages/FaqPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import MarketingLayout from "./components/MarketingLayout";
import StudentDashboard from "./pages/StudentDashboard";
import ApplyMentorPage from "./pages/ApplyMentorPage";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminCategoriesPage from "./pages/AdminCategoriesPage";
import BrowseMentorsPage from "./pages/BrowseMentorsPage";
import MentorAvailabilityPage from "./pages/MentorAvailabilityPage";
import MentorDetailPage from "./pages/MentorDetailPage";
import StudentBookingsPage from "./pages/StudentBookingsPage";
import MentorBookingsPage from "./pages/MentorBookingsPage";
import MentorEditProfilePage from "./pages/MentorEditProfilePage";

function App() {
  return (
    <Routes>
      {/* Public marketing pages share the site header/footer and the in-page
          hash scrolling that NavLink alone does not provide. */}
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </Route>

<Route
  path="/admin-dashboard"
  element={
    <ProtectedRoute allowedRoles={["Administrator"]}>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>
<Route
  path="/mentor-dashboard"
  element={
    <ProtectedRoute allowedRoles={["Mentor"]}>
      <MentorDashboard />
    </ProtectedRoute>
  }
/>
<Route
  path="/browse-mentors"
  element={
    <ProtectedRoute allowedRoles={["Student", "Mentor", "Administrator"]}>
      <BrowseMentorsPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/mentor/:mentorId"
  element={
    <ProtectedRoute allowedRoles={["Student", "Mentor", "Administrator"]}>
      <MentorDetailPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/mentor-availability"
  element={
    <ProtectedRoute allowedRoles={["Mentor"]}>
      <MentorAvailabilityPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/mentor-bookings"
  element={
    <ProtectedRoute allowedRoles={["Mentor"]}>
      <MentorBookingsPage />
    </ProtectedRoute>
  }
/>
      <Route
        path="/student-dashboard"
        element={
          <ProtectedRoute allowedRoles={["Student", "Mentor", "Administrator"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
<Route
  path="/student-bookings"
  element={
    <ProtectedRoute allowedRoles={["Student"]}>
      <StudentBookingsPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/mentor-edit-profile"
  element={
    <ProtectedRoute allowedRoles={["Mentor"]}>
      <MentorEditProfilePage />
    </ProtectedRoute>
  }
/>

      <Route
        path="/apply-mentor"
        element={
          <ProtectedRoute allowedRoles={["Student"]}>
            <ApplyMentorPage />
          </ProtectedRoute>
        }
      />
      <Route
  path="/admin-categories"
  element={
    <ProtectedRoute allowedRoles={["Administrator"]}>
      <AdminCategoriesPage />
    </ProtectedRoute>
  }
/>

      <Route
        path="*"
        element={
          <main style={{ padding: "2rem" }}>
            <h1>Page Not Found</h1>
            <p>The page you requested does not exist.</p>
          </main>
        }
      />
    </Routes>
  );
}

export default App;