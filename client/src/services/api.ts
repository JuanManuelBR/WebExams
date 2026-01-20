import axios from 'axios';

export const usersApi = axios.create({
  baseURL: "/api/users",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 10000,
});


export const examsAttemptsApi = axios.create({
  baseURL: "/api/exam",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 10000,
});