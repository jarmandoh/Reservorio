export interface Business {
  id:             string;
  name:           string;
  category:       string;
  description:    string;
  location:       string;
  rating:         number;
  reviews:        number;
  tags:           string[];
  available:      number;
  total:          number;
  routePath:      string;
  gradient:       string;
  icon:           string;
  // Extended fields
  schedule?:      string;
  logo?:          string;
  phone?:         string;
  active?:        boolean;
  sheetId?:       string;
  appsScriptUrl?: string;
}

export interface NewBusinessPayload {
  name:          string;
  category:      string;
  description?:  string;
  location?:     string;
  gradient?:     string;
  icon?:         string;
  schedule?:     string;
  logo?:         string;
  phone?:        string;
  tags?:         string[] | string;
  pin:           string;
}