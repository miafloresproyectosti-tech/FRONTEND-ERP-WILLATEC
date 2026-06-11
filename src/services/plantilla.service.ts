import api from './api';

export interface Plantilla {
    id: number;
    nombre: string;
    incluye_igv: boolean;
    formato_pdf: string;
    activo: boolean;
}

export const getPlantillas = async (): Promise<Plantilla[]> => {
    const response = await api.get('/plantillas');
    return response.data?.data || response.data;
};
