
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
    writeBatch
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

// Subcategories mapped to parent category names
export const SYSTEM_SUBCATEGORIES: Record<string, string[]> = {
    'Trabalho': [
        'Tarefas operacionais',
        'Reuniões',
        'Demandas urgentes',
        'Planejamento',
        'Follow-ups'
    ],
    'Estudos': [
        'Aulas',
        'Leituras',
        'Exercícios',
        'Projetos acadêmicos',
        'Revisões'
    ],
    'Pessoal': [
        'Família',
        'Social',
        'Lazer',
        'Casa',
        'Compromissos'
    ],
    'Financeiro': [
        'Contas a pagar',
        'Contas a receber',
        'Planejamento financeiro',
        'Investimentos',
        'Orçamento'
    ],
    'Projetos': [
        'Projetos ativos',
        'Projetos pausados',
        'Projetos finalizados',
        'Ideias',
        'Backlog'
    ],
    'Saúde': [
        'Treinos',
        'Consultas',
        'Hábitos',
        'Rotina alimentar',
        'Bem-estar'
    ],
    'Rotina': [
        'Manhã',
        'Tarde',
        'Noite',
        'Semanal',
        'Mensal'
    ]
};

// --- Categories ---

export const fetchCategories = async (userId: string): Promise<Category[]> => {
    try {
        console.log('🔍 Fetching categories for user:', userId);

        // Query without orderBy to avoid composite index requirement
        const q = query(
            collection(db, COLLECTION_CATS),
            where('criada_por', '==', userId)
        );

        const snapshot = await getDocs(q);
        let categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));

        console.log(`📁 Found ${categories.length} existing categories`);

        // Auto-seed if empty for this user
        if (categories.length === 0) {
            console.log('🌱 No categories found, starting seed process...');
            await seedCategoriesAndSubcategories(userId);

            // Refetch after seeding
            const retrySnapshot = await getDocs(q);
            categories = retrySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
            console.log(`✅ After seeding: ${categories.length} categories`);
        }

        // Sort client-side by ordem
        categories.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

        return categories;
    } catch (error) {
        console.error('❌ Error in fetchCategories:', error);
        throw error;
    }
};

export const seedCategoriesAndSubcategories = async (userId: string) => {
    try {
        console.log('🌱 Starting seed process...');
        console.log(`👤 User ID: ${userId}`);

        const batch = writeBatch(db);
        const categoryIdMap: Record<string, string> = {};

        // Create categories
        console.log('📁 Creating categories...');
        SYSTEM_CATEGORIES.forEach((cat, index) => {
            const docRef = doc(collection(db, COLLECTION_CATS));
            categoryIdMap[cat.nome] = docRef.id;

            batch.set(docRef, {
                nome: cat.nome,
                tipo: 'system',
                fixa: true,
                icone: cat.icone,
                cor: cat.cor,
                ordem: index,
                ativa: true,
                criada_em: Timestamp.now(),
                criada_por: userId
            });

            console.log(`  ✅ ${cat.icone} ${cat.nome} (ID: ${docRef.id.substring(0, 8)}...)`);
        });

        // Create subcategories
        console.log('📂 Creating subcategories...');
        let subCount = 0;
        Object.entries(SYSTEM_SUBCATEGORIES).forEach(([categoryName, subcats]) => {
            const categoryId = categoryIdMap[categoryName];
            if (!categoryId) {
                console.warn(`⚠️  Category "${categoryName}" not found in map, skipping subcats`);
                return;
            }

            subcats.forEach((subName, index) => {
                const subDocRef = doc(collection(db, COLLECTION_SUBCATS));
                batch.set(subDocRef, {
                    categoria_id: categoryId,
                    nome: subName,
                    ordem: index,
                    ativa: true
                });
                subCount++;
            });

            console.log(`  ✅ ${categoryName}: ${subcats.length} subcategorias`);
        });

        console.log('💾 Committing batch write to Firestore...');
        await batch.commit();

        console.log(`✅ Seed complete!`);
        console.log(`   📁 Categories created: ${SYSTEM_CATEGORIES.length}`);
        console.log(`   📂 Subcategories created: ${subCount}`);
        console.log(`   💾 Total documents: ${SYSTEM_CATEGORIES.length + subCount}`);

    } catch (error) {
        console.error('❌ Error in seedCategoriesAndSubcategories:', error);
        throw error;
    }
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
    try {
        // Query without orderBy initially to avoid index issues
        const q = query(
            collection(db, COLLECTION_SUBCATS),
            where('categoria_id', '==', categoryId)
        );

        const snapshot = await getDocs(q);
        const subcategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subcategory));

        // Sort client-side
        subcategories.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

        return subcategories;
    } catch (error) {
        console.error('❌ Error fetching subcategories:', error);
        throw error;
    }
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
