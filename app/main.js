import axios from 'axios';
import express from 'express';
import redis from 'redis';
import { config } from 'dotenv';
import { REDIS_TOKEN_KEY, SSID_BODY_KEY, USER_PROFILE_URL } from './constants.js';
import { body, validationResult } from 'express-validator';

async function getUserProfileData(ssid) {
  try {
    const response = await axios.get(USER_PROFILE_URL, { 
      headers: {
        Cookie: `${SSID_BODY_KEY}=${ssid}; Path=/; Secure; HttpOnly;`
      },
      withCredentials: true
    });

    return response.data.data;
  } catch (_) {
    return null;
  }
}

async function bootstrap() {
  config({
    path: '.env',
  });

  const redisClient = redis.createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST
    }
  });
  
  try {
    await redisClient.connect();
  } catch (_) {
    throw new Error('Connection to redis failed');
  }

  const app = express();

  app.use(express.json());

  app.post('/auth', body(SSID_BODY_KEY).notEmpty().isString(), async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(400).send({ message: `${SSID_BODY_KEY} validation failed. Must be a string` });
    }

    await redisClient.set(REDIS_TOKEN_KEY, req.body[SSID_BODY_KEY]);

    
    return res.status(200).send({ message: 'Token set' });
  })

  app.get('/balance', async (_, res) => {
    const ssid = await redisClient.get(REDIS_TOKEN_KEY);

    if (!ssid) {
      return res.status(400).json({ message: 'No token was set' })
    }

    const userData = await getUserProfileData(ssid);

    if (!userData) {
      return res.status(401).json({ message: 'Auth required' });
    }

    return res.status(200).json({ status: true, balance: userData.balance });
  })

  app.listen(3000);
}

bootstrap()
  .then(() => console.log('App started'), (e) => { throw e });
