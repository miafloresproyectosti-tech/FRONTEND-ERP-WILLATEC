import api from './api';

export interface Plataforma {
    id: number;
    nombre: string;
}

export const getPlataformas = async (): Promise<Plataforma[]> => {
    const response = await api.get('/plataformas');
    return response.data;
};