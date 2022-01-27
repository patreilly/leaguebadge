import {useEffect} from 'react';

const useCognitoFormScript = (id) => {
    useEffect(() => {
      // const cognitoScript = document.createElement('script');
      const formScript = document.createElement('script');

      // cognitoScript.src = 'https://www.cognitoforms.com/s/13I_hSJI5UCzePHW0Lommg';
      formScript.innerText = `Cognito.load('forms', { id: '${id}' });`
      // cognitoScript.async = true;
      // formScript.async = true;

      // document.body.appendChild(cognitoScript)
      document.body.appendChild(formScript);

      return () => {
        // document.body.removeChild(cognitoScript)
        document.body.removeChild(formScript)
      }
    }, [id]);
  }

export default useCognitoFormScript;