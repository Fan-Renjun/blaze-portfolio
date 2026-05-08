export type Project = {
  id: string;
  title: string;
  company: string;
  period: string;
  description: string | null;
  image_url: string | null;
  tags: string[];
  external_url: string | null;
  created_at: string;
};

export type Article = {
  id: string;
  title: string;
  summary: string | null;
  publish_date: string | null;
  category: string | null;
  read_time: string | null;
  content: string | null;
  created_at: string;
};

export type Photo = {
  id: string;
  image_url: string;
  category: string | null;
  location: string | null;
  aspect_ratio: string | null;
  orientation: "横屏" | "竖屏" | null;
  created_at: string;
};

export type FitnessStat = {
  id: string;
  week_start: string;
  week_hours: number;
  total_km: number;
  note: string | null;
  created_at: string;
};

export type FitnessPhoto = {
  id: string;
  photo_url: string;
  caption: string | null;
  taken_at: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: Project;
        Insert: Omit<Project, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Project, "id" | "created_at">>;
      };
      articles: {
        Row: Article;
        Insert: Omit<Article, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Article, "id" | "created_at">>;
      };
      photos: {
        Row: Photo;
        Insert: Omit<Photo, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Photo, "id" | "created_at">>;
      };
    };
  };
};
