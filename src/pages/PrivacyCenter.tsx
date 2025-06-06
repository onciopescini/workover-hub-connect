
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PrivacyCenter = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the new privacy page structure
    navigate('/privacy', { replace: true });
  }, [navigate]);

  return null;
};

export default PrivacyCenter;
