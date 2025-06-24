
export interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_photo_url: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  phone: string | null;
  city: string | null;
  profession: string | null;
  competencies: string[] | null;
  industries: string[] | null;
  is_suspended: boolean;
  suspension_reason: string | null;
}
