
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
    { nome: 'Financeiro', icone: '💰', cor: 'bg-emerald-600' },
    { nome: 'Comercial', icone: '🤝', cor: 'bg-blue-600' },
    { nome: 'Pessoal', icone: '👤', cor: 'bg-green-500' },
    { nome: 'Estudos', icone: '📚', cor: 'bg-indigo-500' },
    { nome: 'Parceiros', icone: '👥', cor: 'bg-orange-500' },
    { nome: 'Saúde', icone: '❤️', cor: 'bg-red-500' },
    { nome: 'Rotina', icone: '🔄', cor: 'bg-slate-500' },
];

// Subcategories mapped to parent category names
export const SYSTEM_SUBCATEGORIES: Record<string, string[]> = {
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

export const fetchCategories = async (userId: string): Promise<Category[]> => {
    try {
        console.log('🔍 Buscando categorias para o usuário:', userId);

        const q = query(
            collection(db, COLLECTION_CATS),
            where('criada_por', '==', userId)
        );

        const snapshot = await getDocs(q);
        let categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));

        console.log(`📁 Encontradas ${categories.length} categorias.`);

        // Se estiver vazio, gera o seeding inicial
        if (categories.length === 0) {
            console.log('🌱 Primeiro acesso: Gerando categorias e subcategorias...');
            await seedCategoriesAndSubcategories(userId);
            const retrySnapshot = await getDocs(q);
            categories = retrySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        } else {
            // "AUTO-HEALING": Verifica se faltam subcategorias do sistema (correção proativa)
            // Fazemos isso em background ou apenas se necessário? Vamos fazer check leve.
            const needsSync = categories.some(c => c.fixa && c.tipo === 'system');
            if (needsSync) {
                // Dispara sincronização silenciosa se alguma categoria de sistema existir
                // Isso garante que se o usuário deletou subcats ou se falhou no passado, recuperamos.
                syncSystemSubcategories(userId).catch(e => console.warn("Erro no auto-sync:", e));
            }
        }

        categories.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
        return categories;
    } catch (error) {
        console.error('❌ Erro crítico em fetchCategories:', error);
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

export const syncSystemSubcategories = async (userId: string) => {
    try {
        console.log('🔄 Iniciando sincronização robusta de subcategorias...');
        const cats = await fetchCategories(userId);
        const batch = writeBatch(db);
        let syncCount = 0;

        for (const catName of Object.keys(SYSTEM_SUBCATEGORIES)) {
            // Busca ignorando espaços e case
            const category = cats.find(c =>
                c.nome.trim().toLowerCase() === catName.trim().toLowerCase()
            );

            if (!category) {
                console.warn(`⚠️ Categoria do sistema "${catName}" não encontrada no banco. Pulando.`);
                continue;
            }

            console.log(`📂 Verificando subcategorias para: ${category.nome} (ID: ${category.id})`);
            const existingSubs = await fetchSubcategories(category.id);
            const systemSubs = SYSTEM_SUBCATEGORIES[catName];

            for (const subName of systemSubs) {
                const alreadyExists = existingSubs.some(s =>
                    s.nome.trim().toLowerCase() === subName.trim().toLowerCase()
                );

                if (!alreadyExists) {
                    const subDocRef = doc(collection(db, COLLECTION_SUBCATS));
                    batch.set(subDocRef, {
                        categoria_id: category.id,
                        nome: subName,
                        ordem: systemSubs.indexOf(subName),
                        ativa: true
                    });
                    syncCount++;
                    console.log(`  ➕ Adicionando: ${subName}`);
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
    await deleteDoc(doc(db, COLLECTION_SUBCATS, id));
};

/**
 * Reseta as categorias do usuário para o padrão de sistema original.
 * ATENÇÃO: Isso pode duplicar se não houver cuidado, mas aqui faremos uma limpeza proativa.
 */
export const forceResetCategories = async (userId: string) => {
    console.log('🧹 Iniciando reset forçado de categorias para:', userId);

    // 1. Busca categorias atuais
    const q = query(collection(db, COLLECTION_CATS), where('criada_por', '==', userId));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);

    // 2. Remove categorias e subcategorias antigas (opcional, mas aqui faremos para 're-criar' do zero)
    for (const d of snapshot.docs) {
        // Remove subcategorias vinculadas
        const subQ = query(collection(db, COLLECTION_SUBCATS), where('categoria_id', '==', d.id));
        const subSnap = await getDocs(subQ);
        subSnap.docs.forEach(sd => batch.delete(sd.ref));

        // Remove a categoria
        batch.delete(d.ref);
    }

    await batch.commit();

    // 3. Roda o seed novamente
    await seedCategoriesAndSubcategories(userId);
    console.log('✅ Reset de categorias concluído com sucesso.');
};
