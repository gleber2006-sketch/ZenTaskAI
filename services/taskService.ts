
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
    writeBatch,
    getDoc,
    onSnapshot
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

export const subscribeToTasks = (userId: string, onUpdate: (tasks: Task[]) => void) => {
    const q = query(
        collection(db, COLLECTION_TASKS),
        where('userId', '==', userId)
    );

    return onSnapshot(q, (snapshot) => {
        let tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));

        // Same sorting logic as fetchTasks
        tasks.sort((a, b) => {
            const ordemA = a.ordem || 0;
            const ordemB = b.ordem || 0;
            if (ordemA !== ordemB) return ordemA - ordemB;

            const dataA = (a.criada_em as any)?.seconds || 0;
            const dataB = (b.criada_em as any)?.seconds || 0;
            return dataB - dataA;
        });

        onUpdate(tasks);
    }, (error) => {
        console.error("Error subscribing to tasks:", error);
    });
};

export const createTask = async (userId: string, data: Partial<Task>) => {
    const cleanData = {
        userId,
        titulo: data.titulo || 'Nova Tarefa',
        descricao: data.descricao || '',
        categoria_id: data.categoria_id || '',
        subcategoria_id: data.subcategoria_id || null,
        prioridade: data.prioridade || 'media',
        status: data.status || 'pendente',
        tipo: data.tipo || 'tarefa',
        prazo: data.prazo || null,
        data_inicio: data.data_inicio || null,
        recorrencia: data.recorrencia || null,
        ordem: data.ordem || 0,
        value: data.value || null,
        fluxo: data.fluxo || null,
        metadata: data.metadata || null,
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

export const deleteAllTasks = async (userId: string, filters?: { categoria_id?: string, subcategoria_id?: string }) => {
    let q = query(collection(db, COLLECTION_TASKS), where('userId', '==', userId));

    if (filters?.categoria_id) {
        q = query(q, where('categoria_id', '==', filters.categoria_id));
    }
    if (filters?.subcategoria_id) {
        q = query(q, where('subcategoria_id', '==', filters.subcategoria_id));
    }

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

export const getPublicTask = async (taskId: string): Promise<Task | null> => {
    try {
        const docRef = doc(db, COLLECTION_TASKS, taskId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            // Security check: only allow if explicitly shared (or we can skip for now if simplicity is key, but let's be safe)
            if (data.shared) {
                return { id: snap.id, ...data } as Task;
            }
            console.warn(`⚠️ Task ${taskId} is not marked as shared.`);
        }
        return null;
    } catch (e) {
        console.error("Error fetching public task:", e);
        return null;
    }
};

export const completeTaskExternally = async (taskId: string, completerName: string) => {
    const docRef = doc(db, COLLECTION_TASKS, taskId);
    await updateDoc(docRef, {
        status: 'concluida',
        atualizada_em: Timestamp.now(),
        metadata: {
            completed_by_external: true,
            external_completer_name: completerName
        }
    });
};

export const acceptTaskExternally = async (taskId: string, acceptorName: string) => {
    const docRef = doc(db, COLLECTION_TASKS, taskId);
    await updateDoc(docRef, {
        atualizada_em: Timestamp.now(),
        metadata: {
            accepted_by_name: acceptorName,
            accepted_at: Timestamp.now()
        }
    });
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

        // Extract specialized fields into metadata
        const metadata: Record<string, any> = {};
        const knownFields = ['title', 'description', 'category', 'subcategory', 'importance', 'startDate', 'endDate', 'value', 'status', 'tipo'];
        Object.keys(data).forEach(key => {
            if (!knownFields.includes(key)) {
                // @ts-ignore
                metadata[key] = data[key];
            }
        });

        batch.set(newTaskRef, {
            userId,
            titulo: data.title,
            descricao: data.description || "",
            categoria_id,
            subcategoria_id,
            prioridade: (data.importance as any) || 'media',
            status: data.status || 'pendente',
            tipo: data.tipo || 'tarefa',
            prazo: data.startDate ? Timestamp.fromDate(new Date(data.startDate)) : null,
            ordem: 0,
            criada_em: Timestamp.now(),
            atualizada_em: Timestamp.now(),
            metadata: Object.keys(metadata).length > 0 ? metadata : null,
            // Map legacy and finance fields
            value: data.value || null,
            fluxo: data.fluxo || null
        });
    }

    await batch.commit();
};

export const migrateExistingTasksFinance = async (userId: string) => {
    console.log('🚀 Iniciando migração financeira retroativa...');

    // 1. Carregar categorias e tarefas
    const catsTask = fetchCategories(userId);
    const tasksTask = fetchTasks(userId);

    const [categories, tasks] = await Promise.all([catsTask, tasksTask]);

    // Mapear subcategorias para cada categoria encontrada nas tarefas
    const subcatsMap: Record<string, any[]> = {};
    const categoriesInTasks = Array.from(new Set(tasks.map(t => t.categoria_id)));

    for (const catId of categoriesInTasks) {
        if (catId) subcatsMap[catId] = await fetchSubcategories(catId);
    }

    const batch = writeBatch(db);
    let count = 0;

    for (const task of tasks) {
        // Regra: Somente se tiver valor e não tiver fluxo definido (Blindagem)
        if (task.value && !task.fluxo) {
            const category = categories.find(c => c.id === task.categoria_id);
            const subcategory = task.subcategoria_id ? subcatsMap[task.categoria_id]?.find(s => s.id === task.subcategoria_id) : null;

            const catName = category?.nome.toLowerCase() || '';
            const subName = subcategory?.nome.toLowerCase() || '';

            let suggestedFluxo: 'entrada' | 'saida' | null = null;

            // Lógica de Mapeamento Baseada em Nomes
            if (subName.includes('receber')) suggestedFluxo = 'entrada';
            else if (catName === 'comercial') suggestedFluxo = 'entrada';
            else if (subName.includes('pagar')) suggestedFluxo = 'saida';
            else if (subName.includes('compra')) suggestedFluxo = 'saida';
            else if (catName === 'trabalho') suggestedFluxo = 'entrada';

            if (suggestedFluxo) {
                const docRef = doc(db, COLLECTION_TASKS, task.id);
                batch.update(docRef, {
                    fluxo: suggestedFluxo,
                    atualizada_em: Timestamp.now()
                });
                count++;
            }
        }
    }

    if (count > 0) {
        await batch.commit();
        console.log(`✅ Migração concluída: ${count} tarefas atualizadas.`);
    } else {
        console.log('ℹ️ Nenhuma tarefa precisava de migração.');
    }

    return count;
};

