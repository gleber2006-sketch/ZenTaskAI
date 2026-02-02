// Script para popular categorias e subcategorias no Firestore
// Execute com: node seed-categories.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch, Timestamp } from 'firebase/firestore';

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBP0fw0FcWP22soZN--gLXb5nK4gTmi0hk",
    authDomain: "zentask-ai.firebaseapp.com",
    projectId: "zentask-ai",
    storageBucket: "zentask-ai.firebasestorage.app",
    messagingSenderId: "704648689934",
    appId: "1:704648689934:web:8075afe68e679b896dff5f",
    measurementId: "G-T1MWGE2743"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Categorias do sistema
const SYSTEM_CATEGORIES = [
    { nome: 'Trabalho', icone: '💼', cor: 'bg-blue-500' },
    { nome: 'Estudos', icone: '📚', cor: 'bg-purple-500' },
    { nome: 'Pessoal', icone: '👤', cor: 'bg-green-500' },
    { nome: 'Financeiro', icone: '💰', cor: 'bg-emerald-600' },
    { nome: 'Projetos', icone: '🚀', cor: 'bg-orange-500' },
    { nome: 'Saúde', icone: '❤️', cor: 'bg-red-500' },
    { nome: 'Rotina', icone: '🔄', cor: 'bg-slate-500' },
];

// Subcategorias mapeadas por categoria
const SYSTEM_SUBCATEGORIES = {
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

async function seedCategories(userId) {
    console.log('🚀 Iniciando seeding de categorias...');
    console.log(`👤 User ID: ${userId}`);

    const batch = writeBatch(db);
    const categoryIdMap = {};
    let categoryCount = 0;
    let subcategoryCount = 0;

    // Criar categorias
    console.log('\n📁 Criando categorias...');
    SYSTEM_CATEGORIES.forEach((cat, index) => {
        const docRef = doc(collection(db, 'categories'));
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

        categoryCount++;
        console.log(`  ✅ ${cat.icone} ${cat.nome} (ID: ${docRef.id})`);
    });

    // Criar subcategorias
    console.log('\n📂 Criando subcategorias...');
    Object.entries(SYSTEM_SUBCATEGORIES).forEach(([categoryName, subcats]) => {
        const categoryId = categoryIdMap[categoryName];
        if (!categoryId) {
            console.log(`  ⚠️  Categoria "${categoryName}" não encontrada, pulando subcategorias`);
            return;
        }

        console.log(`\n  📁 ${categoryName}:`);
        subcats.forEach((subName, index) => {
            const subDocRef = doc(collection(db, 'subcategories'));
            batch.set(subDocRef, {
                categoria_id: categoryId,
                nome: subName,
                ordem: index,
                ativa: true
            });

            subcategoryCount++;
            console.log(`    ✅ ${subName}`);
        });
    });

    // Executar batch
    console.log('\n💾 Salvando no Firestore...');
    await batch.commit();

    console.log('\n✅ Seeding completado com sucesso!');
    console.log(`📊 Resumo:`);
    console.log(`   - Categorias criadas: ${categoryCount}`);
    console.log(`   - Subcategorias criadas: ${subcategoryCount}`);
    console.log(`   - Total de documentos: ${categoryCount + subcategoryCount}`);
}

// Executar script
const userId = process.argv[2];

if (!userId) {
    console.error('❌ Erro: User ID não fornecido');
    console.log('\n📖 Uso:');
    console.log('   node seed-categories.js <USER_ID>');
    console.log('\n💡 Exemplo:');
    console.log('   node seed-categories.js abc123xyz');
    console.log('\n🔍 Para obter seu User ID:');
    console.log('   1. Faça login na aplicação');
    console.log('   2. Abra o DevTools (F12)');
    console.log('   3. Console → digite: firebase.auth().currentUser.uid');
    process.exit(1);
}

seedCategories(userId)
    .then(() => {
        console.log('\n🎉 Processo finalizado!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Erro ao executar seeding:', error);
        process.exit(1);
    });
