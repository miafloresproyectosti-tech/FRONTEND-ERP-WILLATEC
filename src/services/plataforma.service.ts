import api from './api';
import { cachedRequest } from '../utils/cache';

export interface Plataforma {
    id: number;
    nombre: string;
}

export const getPlataformas = async (): Promise<Plataforma[]> => {
    return cachedRequest(
        'catalog:plataformas',
        async () => {
            const response = await api.get('/plataformas');
            return response.data;
        },
        { ttlMs: 6 * 60 * 60 * 1000 }
    );
};
