'use client';

import axios from 'axios';
import { useAuth } from '@/auth/AuthProvider';

export function useApi() {
	const { getToken } = useAuth();
	const instance = axios.create({
		baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
		withCredentials: false,
	});

	instance.interceptors.request.use(async (config) => {
		const token = await getToken();
		if (token) {
			config.headers = config.headers || {};
			(config.headers as any).Authorization = `Bearer ${token}`;
		}
		return config;
	});

	return instance;
}


