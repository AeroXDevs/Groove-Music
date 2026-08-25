
async function waitForNodeConnection(manager, maxWaitTime = 5000) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
        const connectedNodes = [...manager.shoukaku.nodes.values()].filter(node => node.state === 2);

        if (connectedNodes.length > 0) {
            return true;
        }


        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return false;
}


function hasAvailableNodes(manager) {
    const availableNodes = [...manager.shoukaku.nodes.values()].filter(
        node => node.state === 1 || node.state === 2
    );
    return availableNodes.length > 0;
}


function getAvailableNode(manager) {
    const nodes = [...manager.shoukaku.nodes.values()].filter(
        node => node.state === 1 || node.state === 2
    );
    return nodes.length > 0 ? nodes[0] : null;
}

module.exports = {
    waitForNodeConnection,
    hasAvailableNodes,
    getAvailableNode
};
