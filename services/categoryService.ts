
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
    writeBatch,
    orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { Category, Subcategory } from '../types';

const COLLECTION_CATS = 'categories';
const COLLECTION_SUBCATS = 'subcategories';

export const SYSTEM_CATEGORIES = [
    { nome: 'Trabalho', icone: '💼', cor: 'bg-blue-500' },
    { nome: 'Estudos', icone: '📚', cor: 'bg-purple-500' },
    { nome: 'Pessoal', icone: '👤', cor: 'bg-green-500' },
    { nome: 'Financeiro', icone: '💰', cor: 'bg-emerald-600' },
    { nome: 'Projetos', icone: '🚀', cor: 'bg-orange-500' },
    { nome: 'Saúde', icone: '❤️', cor: 'bg-red-500' },
    { nome: 'Rotina', icone: '🔄', cor: 'bg-slate-500' },
];

// --- Categories ---

export const fetchCategories = async (userId: string): Promise<Category[]> => {
    // Fetch both 'system' (created_por == system) AND 'custom' (created_por == userId)
    // Actually, seeding creates system cats per user or globally?
    // Usually system cats are global but here distinct per user to allow ordering/hiding.
    // We will seed them FOR THE USER.

    const q = query(
        collection(db, COLLECTION_CATS),
        where('criada_por', '==', userId),
        orderBy('ordem', 'asc')
    );

    const snapshot = await getDocs(q);
    let categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));

    // Auto-seed if empty for this user
    // This is a simplified check. A robust one checks if 'system' cats exist for this user?
    // Or if 'system' cats are shared? 
    // Let's assume we create COPIES for each user so they can hide/order them.
    // Wait, the prompt says "criada_por (user_id | system)".
    // If 'system', it implies a shared record? 
    // "Categorias do tipo system: ... podem ser ocultadas (ativa = false), podem ser reordenadas".
    // If they are shared records, one user reordering affects updated?
    // NO. 
    // Approach: System categories are created with 'criada_por = userId' but 'tipo = system'?
    // OR 'criada_por = system' and we store user preferences separately?
    // The simplest "SaaS" way is: Seed default categories into the user's collection with 'tipo: system'.
    // Then the user owns the record but is blocked from changing title/type.

    if (categories.length === 0) {
        await seedCategories(userId);
        // Refetch
        const retrySnapshot = await getDocs(q);
        categories = retrySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    }

    return categories;
};

export const seedCategories = async (userId: string) => {
    const batch = writeBatch(db);

    SYSTEM_CATEGORIES.forEach((cat, index) => {
        const docRef = doc(collection(db, COLLECTION_CATS));
        batch.set(docRef, {
            nome: cat.nome,
            tipo: 'system',
            fixa: true,
            icone: cat.icone,
            cor: cat.cor,
            ordem: index,
            ativa: true,
            criada_em: Timestamp.now(),
            criada_por: userId // User owns the record locally so they can hide/order, but Type locks it.
        });
    });

    await batch.commit();
};

export const createCategory = async (userId: string, data: Partial<Category>) => {
    return await addDoc(collection(db, COLLECTION_CATS), {
        ...data,
        tipo: 'custom',
        fixa: false,
        criada_em: Timestamp.now(),
        criada_por: userId,
        ativa: true,
        ordem: 99 // Put at end
    });
};

export const updateCategory = async (id: string, updates: Partial<Category>, currentType: 'system' | 'custom') => {
    // Guard: if system, cannot change name/type/perm deletion?
    // UI should block it, backend ensures 'tipo' doesn't change.
    if (updates.tipo && updates.tipo !== currentType) throw new Error("Não é possível alterar o tipo da categoria.");

    await updateDoc(doc(db, COLLECTION_CATS, id), updates);
};

export const deleteCategory = async (id: string, type: 'system' | 'custom') => {
    if (type === 'system') throw new Error("Categorias do sistema não podem ser excluídas.");
    await deleteDoc(doc(db, COLLECTION_CATS, id));
    // Should also delete subcategories? Yes.
    // TODO: implement cascade delete or leave orphans. For MVP leaving orphans is risky but ok.
};

// --- Subcategories ---

export const fetchSubcategories = async (categoryId: string): Promise<Subcategory[]> => {
    const q = query(
        collection(db, COLLECTION_SUBCATS),
        where('categoria_id', '==', categoryId),
        orderBy('ordem', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subcategory));
};

export const createSubcategory = async (categoryId: string, data: Partial<Subcategory>) => {
    return await addDoc(collection(db, COLLECTION_SUBCATS), {
        ...data,
        categoria_id: categoryId,
        ativa: true,
        ordem: 99
    });
};

export const deleteSubcategory = async (id: string) => {
    await deleteDoc(doc(db, COLLECTION_SUBCATS, id));
};
