export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    const taskId = url.searchParams.get('task');

    // Se não houver taskId, segue o fluxo normal
    if (!taskId) {
        return next();
    }

    // Busca o HTML original
    const response = await next();

    try {
        // Busca dados da tarefa via Firestore REST API (v1)
        // URL format: https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/tasks/{task_id}
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/zentask-ai/databases/(default)/documents/tasks/${taskId}`;
        const taskResponse = await fetch(firestoreUrl);

        if (!taskResponse.ok) {
            return response;
        }

        const taskData = await taskResponse.json();
        const taskTitle = taskData.fields?.titulo?.stringValue || 'Tarefa ZenTask';
        const taskDesc = taskData.fields?.descricao?.stringValue || 'Você recebeu uma tarefa no ZenTask Pro. Toque para ver detalhes e concluir.';

        // Injeta as meta-tags no HTML usando HTMLRewriter
        return new HTMLRewriter()
            .on('meta[property="og:title"]', {
                element(element) {
                    element.setAttribute('content', `🚀 Tarefa: ${taskTitle}`);
                },
            })
            .on('meta[property="og:description"]', {
                element(element) {
                    element.setAttribute('content', taskDesc);
                },
            })
            .on('meta[property="og:url"]', {
                element(element) {
                    element.setAttribute('content', request.url);
                },
            })
            .on('title', {
                element(element) {
                    element.setInnerContent(`ZenTask Pro | ${taskTitle}`);
                }
            })
            .transform(response);

    } catch (error) {
        console.error('Error fetching task for OG tags:', error);
        return response;
    }
}
