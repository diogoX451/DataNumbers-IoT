import axios from "axios";
import { useEffect, useState } from "react";
import cookieCutter from 'cookie-cutter'; 

const useGetAxios = (url: string, isAuth: boolean) => {
  const [data, setData] = useState<object | null>(null);
  const [error, setError] = useState<string>("");
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    const cancelTokenSource = axios.CancelToken.source();

    (async () => {
      try {
        const headers = {};

        if (isAuth) {
          const token = cookieCutter.get('@data-token'); 
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        }

        const response = await axios.get(url, { headers, cancelToken: cancelTokenSource.token, baseURL: 'http://localhost:3000' });
        setData(response.data);
      } catch (err) {
        if (!axios.isCancel(err)) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        setLoaded(true);
      }
    })();

    return () => {
      cancelTokenSource.cancel();
    };
  }, [url, isAuth]); 

  return { data, error, loaded };
};

export default useGetAxios;
