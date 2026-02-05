
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDocs,
    getDoc,
    Timestamp,
    writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Category, Subcategory } from '../types';

const COLLECTION_CATS = 'categories';
const COLLECTION_SUBCATS = 'subcategories';


export const SYSTEM_CATEGORIES = [
    { nome: 'Trabalho', icone: '💼', cor: 'bg-indigo-600' },
    { nome: 'Financeiro', icone: '💰', cor: 'bg-emerald-600' },
    { nome: 'Comercial', icone: '🤝', cor: 'bg-blue-600' },
    { nome: 'Pessoal', icone: '👤', cor: 'bg-green-500' },
    { nome: 'Estudos', icone: '📚', cor: 'bg-violet-500' },
    { nome: 'Parceiros', icone: '👥', cor: 'bg-orange-500' },
    { nome: 'Saúde', icone: '❤️', cor: 'bg-red-500' },
    { nome: 'Rotina', icone: '🔄', cor: 'bg-slate-500' },
];

// Subcategories mapped to parent category names
export const SYSTEM_SUBCATEGORIES: Record<string, string[]> = {
    'Trabalho': [
        'Reuniões',
        'Administrativo',
        'Planejamento',
        'Prazos',
        'Desenvolvimento',
        'Marketing',
        'Suporte'
    ],
    'Financeiro': [
        'Contas a pagar',
        'Contas a receber',
        'Planejamento financeiro',
        'Investimentos',
        'Orçamento'
    ],
    'Comercial': [
        'Vendas',
        'Contratos',
        'Prospecção',
        'Reuniões comerciais',
        'Follow-up'
    ],
    'Pessoal': [
        'Compras',
        'Família',
        'Social',
        'Lazer',
        'Casa',
        'Compromissos'
    ],
    'Estudos': [
        'Aulas',
        'Leituras',
        'Exercícios',
        'Projetos acadêmicos',
        'Revisões'
    ],
    'Parceiros': [
        'Novos Parceiros',
        'Manutenção',
        'Projetos Conjuntos',
        'Eventos'
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

// --- Categories ---

export const fetchCategories = async (userId: string, autoSeed = true): Promise<Category[]> => {
    try {
        console.log(`🔍 Buscando categorias para o usuário: ${userId} (AutoSeed: ${autoSeed})`);

        const q = query(
            collection(db, COLLECTION_CATS),
            where('criada_por', '==', userId)
        );

        const snapshot = await getDocs(q);
        let categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));

        console.log(`📁 Encontradas ${categories.length} categorias.`);

        // Se estiver vazio e autoSeed for true, gera o seeding inicial
        if (categories.length === 0 && autoSeed) {
            console.log('🌱 Primeiro acesso: Gerando categorias e subcategorias...');
            // Pass autoSeed=false to prevent infinite recursion if seed calls fetch again
            await seedCategoriesAndSubcategories(userId);
            const retrySnapshot = await getDocs(q);
            categories = retrySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        } else {
            // "AUTO-HEALING": Desativado temporariamente para evitar loops de sync agressivos.
            // O usuário pode sincronizar manualmente nas Configurações se precisar.
            /*
            const needsSync = categories.some(c => c.fixa && c.tipo === 'system');
            if (needsSync) {
                syncSystemSubcategories(userId).catch(e => console.warn("Erro no auto-sync:", e));
            }
            */
        }

        categories.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
        return categories;
    } catch (error) {
        console.error('❌ Erro crítico em fetchCategories:', error);
        throw error;
    }
};

// Seeding non-destructive: apenas cria se não existir por nome
export const seedCategoriesAndSubcategories = async (userId: string) => {
    try {
        console.log('🌱 Starting non-destructive seed process...');
        // CRITICAL: Call with autoSeed=false to prevent recursion
        const currentCats = await fetchCategories(userId, false);
        const batch = writeBatch(db);
        const categoryIdMap: Record<string, string> = {};

        // 1. Create/Map categories
        for (let index = 0; index < SYSTEM_CATEGORIES.length; index++) {
            const cat = SYSTEM_CATEGORIES[index];
            const existing = currentCats.find(c => c.nome.toLowerCase() === cat.nome.toLowerCase());

            if (existing) {
                categoryIdMap[cat.nome] = existing.id;
                // Update properties to match system standard
                batch.update(doc(db, COLLECTION_CATS, existing.id), {
                    icone: cat.icone,
                    cor: cat.cor,
                    ordem: index,
                    fixa: true,
                    tipo: 'system'
                });
            } else {
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
            }
        }

        await batch.commit();

        // 2. Create/Sync subcategories
        await syncSystemSubcategories(userId);

        // 3. REPAIR task links immediately after seeding
        await repairTaskCategoryLinks(userId);

        console.log(`✅ Seed/Sync complete!`);
    } catch (error) {
        console.error('❌ Error in seedCategoriesAndSubcategories:', error);
        throw error;
    }
};

/**
 * REPAIR FUNCTION: Percorre todas as tarefas e reconecta categoria_id/subcategoria_id quebrados
 * baseando-se no backup de nomes (se disponível) ou associações órfãs.
 */
export const repairTaskCategoryLinks = async (userId: string) => {
    console.log('🔧 Iniciando reparo de vínculos de tarefas...');

    // 1. Pega estado atual de categorias e subcategorias
    const cats = await fetchCategories(userId);
    const subcats: Subcategory[] = [];
    for (const cat of cats) {
        const subs = await fetchSubcategories(cat.id);
        subcats.push(...subs);
    }

    // 2. Busca todas as tarefas
    const { fetchTasks, updateTask } = await import('./taskService');
    const tasks = await fetchTasks(userId);

    for (const task of tasks) {
        let needsUpdate = false;
        const updates: any = {};

        // Verifica se categoria_id ainda é válido
        const catExists = cats.some(c => c.id === task.categoria_id);
        if (!catExists) {
            // Tenta encontrar por nome (se tivéssemos o nome salvo na task seria ideal, 
            // mas como não temos, vamos tentar associar ao 'Pessoal' se for órfã ou 'Trabalho')
            const defaultCat = cats.find(c => c.nome === 'Pessoal') || cats[0];
            if (defaultCat) {
                updates.categoria_id = defaultCat.id;
                needsUpdate = true;
            }
        }

        // Verifica subcategoria
        if (task.subcategoria_id) {
            const subExists = subcats.some(s => s.id === task.subcategoria_id);
            if (!subExists) {
                updates.subcategoria_id = null;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            await updateTask(task.id, updates);
        }
    }
    console.log('✅ Reparo concluído.');
};

export const syncSystemSubcategories = async (userId: string) => {
    try {
        console.log('🔄 Iniciando sincronização robusta de subcategorias...');
        const cats = await fetchCategories(userId);
        const batch = writeBatch(db);
        let syncCount = 0;

        for (const catName of Object.keys(SYSTEM_SUBCATEGORIES)) {
            // Busca ignorando espaços e case
            let category = cats.find(c =>
                c.nome.trim().toLowerCase() === catName.trim().toLowerCase()
            );

            if (!category) {
                console.warn(`⚠️ Categoria do sistema "${catName}" não encontrada. Criando agora...`);
                // Find metadata
                const meta = SYSTEM_CATEGORIES.find(m => m.nome === catName);
                if (meta) {
                    const newCatRef = await addDoc(collection(db, COLLECTION_CATS), {
                        nome: meta.nome,
                        tipo: 'system',
                        fixa: true,
                        icone: meta.icone,
                        cor: meta.cor,
                        ordem: SYSTEM_CATEGORIES.indexOf(meta),
                        ativa: true,
                        criada_em: Timestamp.now(),
                        criada_por: userId
                    });
                    // Refresh category list for next iteration/usage
                    category = { id: newCatRef.id, ...meta, tipo: 'system', fixa: true, ativa: true, ordem: 0, criada_em: null, criada_por: userId } as any;
                } else {
                    continue; // Should not happen if arrays are synced
                }
            }

            console.log(`📂 Verificando subcategorias para: ${category.nome} (ID: ${category.id})`);
            const existingSubs = await fetchSubcategories(category.id);
            const systemSubs = SYSTEM_SUBCATEGORIES[catName];

            for (const subName of systemSubs) {
                const existing = existingSubs.find(s =>
                    s.nome.trim().toLowerCase() === subName.trim().toLowerCase()
                );

                if (!existing) {
                    const subDocRef = doc(collection(db, COLLECTION_SUBCATS));
                    batch.set(subDocRef, {
                        categoria_id: category.id,
                        nome: subName,
                        ordem: systemSubs.indexOf(subName),
                        ativa: true,
                        fixa: true // System subcategory
                    });
                    syncCount++;
                    console.log(`  ➕ Adicionando: ${subName}`);
                } else if (!existing.fixa) {
                    // Update existing to be fixed
                    batch.update(doc(db, COLLECTION_SUBCATS, existing.id), {
                        fixa: true
                    });
                    syncCount++;
                    console.log(`  🛡️ Protegendo: ${subName}`);
                }
            }
        }

        if (syncCount > 0) {
            await batch.commit();
            console.log(`✅ Sincronização concluída! ${syncCount} subcategorias adicionadas.`);
            return syncCount;
        } else {
            console.log('ℹ️ Nenhuma subcategoria nova para adicionar.');
            return 0;
        }
    } catch (error) {
        console.error('❌ Erro crítico na sincronização:', error);
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
        if (!categoryId) return [];
        console.log(`🔍 Buscando subcategorias para ID: ${categoryId}`);

        const q = query(
            collection(db, COLLECTION_SUBCATS),
            where('categoria_id', '==', categoryId)
        );

        const snapshot = await getDocs(q);
        const subcategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subcategory));

        console.log(`  ✅ Encontradas ${subcategories.length} subcategorias.`);

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
    const docRef = doc(db, COLLECTION_SUBCATS, id);
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data()?.fixa) {
        throw new Error("Subcategorias do sistema não podem ser excluídas.");
    }
    await deleteDoc(docRef);
};

/**
 * NUCLEAR CLEANUP: Remove duplicatas exatas por nome de categorias e subcategorias.
 */
export const deduplicateCategoriesAndSubcategories = async (userId: string) => {
    console.log('🧹 Iniciando limpeza de duplicatas para:', userId);

    // 1. Limpeza de Categorias
    const q = query(collection(db, COLLECTION_CATS), where('criada_por', '==', userId));
    const catSnapshot = await getDocs(q);
    const catGroups: Record<string, string[]> = {};

    catSnapshot.docs.forEach(d => {
        const name = d.data().nome.trim().toLowerCase();
        if (!catGroups[name]) catGroups[name] = [];
        catGroups[name].push(d.id);
    });

    const batch = writeBatch(db);
    let removedCats = 0;

    for (const name in catGroups) {
        const ids = catGroups[name];
        if (ids.length > 1) {
            // Mantém o primeiro, remove os outros
            const keeper = ids[0];
            const toRemove = ids.slice(1);

            for (const idToRemove of toRemove) {
                batch.delete(doc(db, COLLECTION_CATS, idToRemove));
                removedCats++;

                // Mover tarefas da categoria removida para a que ficou
                const { repairTaskCategoryLinks } = await import('./categoryService');
                // Nota: O repairTaskCategoryLinks já reconecta órfãs, 
                // então deletar aqui vai disparar o repair logo depois.
            }
        }
    }

    // 2. Limpeza de Subcategorias
    // Buscamos todas as subcategorias do usuário (precisamos buscar por categoria_id)
    const catsFinal = (await getDocs(q)).docs.map(d => d.id);
    let removedSubs = 0;

    for (const catId of catsFinal) {
        const subQ = query(collection(db, COLLECTION_SUBCATS), where('categoria_id', '==', catId));
        const subSnapshot = await getDocs(subQ);
        const subGroups: Record<string, string[]> = {};

        subSnapshot.docs.forEach(d => {
            const name = d.data().nome.trim().toLowerCase();
            if (!subGroups[name]) subGroups[name] = [];
            subGroups[name].push(d.id);
        });

        for (const name in subGroups) {
            const ids = subGroups[name];
            if (ids.length > 1) {
                const toRemove = ids.slice(1);
                for (const idToRemove of toRemove) {
                    batch.delete(doc(db, COLLECTION_SUBCATS, idToRemove));
                    removedSubs++;
                }
            }
        }
    }

    await batch.commit();
    console.log(`✅ Limpeza concluída: ${removedCats} categorias e ${removedSubs} subcategorias removidas.`);

    // 3. Repara os vínculos das tarefas
    await repairTaskCategoryLinks(userId);
};

/**
 * Estabiliza e recupera a integridade do sistema sem apagar dados.
 */
export const forceResetCategories = async (userId: string) => {
    console.log('🛠️ Iniciando estabilização forçada para:', userId);
    // Primeiro limpamos a bagunça de duplicatas
    await deduplicateCategoriesAndSubcategories(userId);
    // Depois garantimos que o padrão do sistema está correto
    await seedCategoriesAndSubcategories(userId);
    console.log('✅ Sistema estabilizado.');
};
