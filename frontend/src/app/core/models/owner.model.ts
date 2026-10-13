export interface Owner {
  id: string;
  name: string;
  email: string;
}

export interface OwnerAuthPayload {
  name: string;
  email: string;
  password: string;
}
