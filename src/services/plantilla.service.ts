import api from './api';
import { cachedRequest } from '../utils/cache';

export interface Plantilla {
    id: number;
    nombre: string;
    incluye_igv: boolean;
    formato_pdf: string;
    activo: boolean;
}

export const getPlantillas = async (): Promise<Plantilla[]> => {
    return cachedRequest(
        'catalog:plantillas',
        async () => {
            const response = await api.get('/plantillas');
            return response.data?.data || response.data;
        },
        { ttlMs: 6 * 60 * 60 * 1000 }
    );
};
