const dev = {
  API_ENDPOINT_URL: 'https://f4noog8h5d.execute-api.us-west-2.amazonaws.com/prod'
};

const prod = {
  API_ENDPOINT_URL: 'https://f4noog8h5d.execute-api.us-west-2.amazonaws.com/prod'
};

const test = {
  API_ENDPOINT_URL: 'https://api.test.com'
};

const getEnv = () => {
	switch (process.env.NODE_ENV) {
		case 'development':
			return dev
		case 'production':
			return prod
		case 'test':
			return test
		default:
			break;
	}
}

export const env = getEnv()
