export const validateSettingValue = (key: string, value: any): boolean => {
  // Add validation rules based on setting key
  switch (key) {
    case "platform_fee_percentage":
    case "stripe_fee_percentage":
    case "cancellation_fee_percentage":
      return typeof value === "number" && value >= 0 && value <= 100;
    
    case "min_booking_duration":
    case "max_booking_duration":
      return typeof value === "number" && value > 0;
    
    case "booking_approval_timeout_hours":
      return typeof value === "number" && value >= 1 && value <= 72;
    
    case "payment_deadline_minutes":
      return typeof value === "number" && value >= 5 && value <= 60;
    
    case "data_retention_months":
      return typeof value === "number" && value >= 6 && value <= 120;
    
    default:
      return true;
  }
};

export const formatSettingDisplay = (key: string, value: any): string => {
  if (typeof value === "boolean") {
    return value ? "Abilitato" : "Disabilitato";
  }
  
  if (key.includes("percentage")) {
    return `${value}%`;
  }
  
  if (key.includes("minutes")) {
    return `${value} minuti`;
  }
  
  if (key.includes("hours")) {
    return `${value} ore`;
  }
  
  if (key.includes("months")) {
    return `${value} mesi`;
  }
  
  return String(value);
};

export const getSettingCategory = (key: string): string => {
  if (key.includes("platform") || key.includes("enable_") || key === "maintenance_mode") {
    return "general";
  }
  if (key.includes("fee") || key.includes("stripe")) {
    return "payment";
  }
  if (key.includes("booking") || key.includes("cancellation") || key.includes("deadline")) {
    return "booking";
  }
  if (key.includes("moderation")) {
    return "moderation";
  }
  if (key.includes("gdpr") || key.includes("retention") || key.includes("cookie") || key.includes("consent")) {
    return "gdpr";
  }
  return "general";
};
