import axios from "axios";
import { useEffect, useState } from "react";
import cookieCutter from 'cookie-cutter'; // ou sua biblioteca de cookies preferida

const usePostAxios = (url, payload, isAuth) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const headers = {};

        if (isAuth) {
          const token = cookieCutter.get('@data-token'); 
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        }

        const response = await axios.post(url, payload, { headers });
        setData(response.data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoaded(true);
      }
    })();
  }, [url, payload, isAuth]); 

  return { data, error, loaded };
};

export default usePostAxios;
