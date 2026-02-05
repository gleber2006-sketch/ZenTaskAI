
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDocs,
    Timestamp,
    orderBy,
    limit,
    writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Task, TaskStatus, TaskPriority, CreatedTaskData } from '../types';
import { fetchCategories, fetchSubcategories } from './categoryService';

const COLLECTION_TASKS = 'tasks';

// Filter Interface
export interface TaskFilters {
    status?: TaskStatus[]; // Allow multiple status (e.g., != concluida)
    categoria_id?: string;
    prioridade?: TaskPriority;
    search?: string;
}

export const fetchTasks = async (userId: string, filters: TaskFilters = {}): Promise<Task[]> => {
    // Base query: get all user tasks. 
    // Firestore compound queries with != and in can be tricky without indexes.
    // For 'playground' scale, we can fetch all user tasks and filter in memory if checks are complex,
    // or use basic indexes. Let's try to be efficient with Firestore where possible.

    let q = query(
        collection(db, COLLECTION_TASKS),
        where('userId', '==', userId)
        // Removido orderBy composto para evitar erro de índice no Firestore em produção
    );

    console.log(`📡 Buscando tarefas para o usuário: ${userId}`);

    try {
        const snapshot = await getDocs(q);
        let tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        console.log(`✅ ${tasks.length} tarefas encontradas.`);

        // Filtro e Ordenação Client-side (Evita necessidade de índices complexos no Firebase)
        tasks.sort((a, b) => {
            const ordemA = a.ordem || 0;
            const ordemB = b.ordem || 0;
            if (ordemA !== ordemB) return ordemA - ordemB;

            const dataA = (a.criada_em as any)?.seconds || 0;
            const dataB = (b.criada_em as any)?.seconds || 0;
            return dataB - dataA;
        });
        if (filters.status && filters.status.length > 0) {
            tasks = tasks.filter(t => filters.status!.includes(t.status));
        }

        if (filters.categoria_id) {
            tasks = tasks.filter(t => t.categoria_id === filters.categoria_id);
        }

        if (filters.prioridade) {
            tasks = tasks.filter(t => t.prioridade === filters.prioridade);
        }

        if (filters.search) {
            const lowerTerm = filters.search.toLowerCase();
            tasks = tasks.filter(t =>
                t.titulo.toLowerCase().includes(lowerTerm) ||
                (t.descricao && t.descricao.toLowerCase().includes(lowerTerm))
            );
        }

        return tasks;

    } catch (error) {
        console.error("Error fetching tasks:", error);
        // Fallback? Return empty
        return [];
    }
};

export const createTask = async (userId: string, data: Partial<Task>) => {
    const cleanData = {
        userId,
        titulo: data.titulo || 'Nova Tarefa',
        descricao: data.descricao || '',
        categoria_id: data.categoria_id || '', // Must be provided ideally
        subcategoria_id: data.subcategoria_id || null,
        prioridade: data.prioridade || 'media',
        status: 'pendente',
        tipo: data.tipo || 'tarefa',
        prazo: data.prazo || null,
        data_inicio: data.data_inicio || null,
        recorrencia: data.recorrencia || null,
        ordem: data.ordem || 0,
        criada_em: Timestamp.now(),
        atualizada_em: Timestamp.now()
    };

    return await addDoc(collection(db, COLLECTION_TASKS), cleanData);
};

// Helper to remove undefined or empty values before sending to Firestore
const cleanPayload = (data: any) => {
    const clean: any = {};
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
            clean[key] = data[key] === '' ? null : data[key];
        }
    });
    return clean;
};

export const updateTask = async (id: string, updates: Partial<Task>) => {
    const payload = cleanPayload({
        ...updates,
        atualizada_em: Timestamp.now()
    });
    await updateDoc(doc(db, COLLECTION_TASKS, id), payload);
};

export const deleteTask = async (id: string) => {
    await deleteDoc(doc(db, COLLECTION_TASKS, id));
};

export const deleteAllTasks = async (userId: string) => {
    const q = query(collection(db, COLLECTION_TASKS), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
};

export const toggleTaskStatus = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'concluida' ? 'pendente' : 'concluida';
    await updateTask(task.id, { status: newStatus });
};

// Quick Actions
export const setTaskPriority = async (id: string, prioridade: TaskPriority) => {
    await updateTask(id, { prioridade });
};

export const createTasksBulk = async (userId: string, taskDataList: CreatedTaskData[]) => {
    const batch = writeBatch(db);

    // Load categories once
    const userCategories = await fetchCategories(userId);

    for (const data of taskDataList) {
        // Find category ID by name (best effort)
        const matchedCategory = userCategories.find(c =>
            c.nome.toLowerCase() === (data.category || 'Trabalho').toLowerCase()
        );
        const categoria_id = matchedCategory?.id || (userCategories[0]?.id || '');

        // Find subcategory if possible
        let subcategoria_id = null;
        if (data.subcategory && matchedCategory) {
            const subcats = await fetchSubcategories(matchedCategory.id);
            const matchedSub = subcats.find(s =>
                s.nome.toLowerCase().includes(data.subcategory!.toLowerCase())
            );
            subcategoria_id = matchedSub?.id || null;
        }

        const newTaskRef = doc(collection(db, COLLECTION_TASKS));
        batch.set(newTaskRef, {
            userId,
            titulo: data.title,
            descricao: data.description || "",
            categoria_id,
            subcategoria_id,
            prioridade: (data.importance as any) || 'media',
            status: 'pendente',
            tipo: 'tarefa',
            prazo: data.startDate ? Timestamp.fromDate(new Date(data.startDate)) : null,
            ordem: 0,
            criada_em: Timestamp.now(),
            atualizada_em: Timestamp.now(),
            // Map extra fields if they exist in schema
            value: data.value || null,
        });
    }

    await batch.commit();
};
