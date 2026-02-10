export async function onRequest(context) {
    const { request, next } = context;
    const url = new URL(request.url);
    const taskId = url.searchParams.get('task');

    // Se não houver taskId, segue o fluxo normal (SPA carrega index.html padrão)
    if (!taskId) {
        return next();
    }

    // Busca o HTML original para servir de base para o HTMLRewriter
    const response = await next();

    try {
        // Firestore REST API v1
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/zentask-ai/databases/(default)/documents/tasks/${taskId}`;
        const taskResponse = await fetch(firestoreUrl);

        if (!taskResponse.ok) {
            // Se a tarefa não existir, retorna o site normal (o SharedTaskLanding tratará o erro no client)
            return response;
        }

        const taskData = await taskResponse.json();
        const fields = taskData.fields || {};

        const taskTitle = fields.titulo?.stringValue || 'Tarefa sem título';
        const taskDesc = fields.descricao?.stringValue || 'Toque para ver os detalhes da tarefa atribuída no ZenTask Pro.';
        const creatorName = fields.criada_por_nome?.stringValue || 'ZenTask AI';

        // Monta o novo título dinâmico
        const seoTitle = `🚀 Tarefa de ${creatorName}: ${taskTitle}`;
        const seoDesc = taskDesc.length > 150 ? taskDesc.substring(0, 147) + '...' : taskDesc;

        // Injeta as meta-tags no HTML antes de enviar para o WhatsApp/Usuário
        return new HTMLRewriter()
            .on('title', {
                element(element) {
                    element.setInnerContent(`ZenTask Pro | ${taskTitle}`);
                }
            })
            .on('meta[property="og:title"]', {
                element(element) {
                    element.setAttribute('content', seoTitle);
                },
            })
            .on('meta[property="og:description"]', {
                element(element) {
                    element.setAttribute('content', seoDesc);
                },
            })
            .on('meta[property="og:url"]', {
                element(element) {
                    element.setAttribute('content', request.url);
                },
            })
            .on('meta[property="og:image"]', {
                element(element) {
                    // Garante que a imagem seja absoluta para o preview carregar
                    element.setAttribute('content', `${url.origin}/logo_zt.png`);
                },
            })
            .transform(response);

    } catch (error) {
        console.error('Error in Dynamic SEO Function:', error);
        return response;
    }
}
