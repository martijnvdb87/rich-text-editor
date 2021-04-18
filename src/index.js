window.RichTextEditor = (element) => {
    let value = element.value;

    let caretPosition = {
        anchor: null,
        focus: null
    };

    let editor;
    let editorContent;

    let blocks = [];

    const buildHtml = () => {
        let container = document.createElement('div');

        blocks.forEach((block) => {
            const newBlock = document.createElement(block.type);

            let blockValue = [];

            block.nodes.forEach((node) => {
                let parentNode;
                let lastNode;

                blockValue.push(node.value);

                node.types.forEach((type) => {
                    newNode = document.createElement(type);
                    if (lastNode) {
                        lastNode.append(newNode);
                    } else {
                        parentNode = newNode;
                    }

                    lastNode = newNode;
                });

                newNode = document.createTextNode(node.value);

                if (lastNode) {
                    lastNode.append(newNode);
                } else {
                    parentNode = newNode;
                }

                if (node.value !== '') {
                    newBlock.append(parentNode);
                }
            });

            if (blockValue.join('') === '') {
                const emptyNode = document.createElement('BR');
                newBlock.append(emptyNode);
                newBlock.className = 'empty-block';
            }

            container.append(newBlock);
        });

        return container.innerHTML;
    };

    const currentTextNode = () => {
        let { anchorNode, focusNode, anchorOffset, focusOffset } = window.getSelection();

        if (anchorNode.nodeType !== 3) {
            anchorNode = [...anchorNode.childNodes].find((node) => node.nodeType === 3);
        }

        if (focusNode.nodeType !== 3) {
            focusNode = [...focusNode.childNodes].find((node) => node.nodeType === 3);
        }

        return { anchorNode, focusNode, anchorOffset, focusOffset };
    };

    const getCaretPosition = () => {
        let { anchorNode, focusNode, anchorOffset, focusOffset } = currentTextNode();

        const find = (parent, positions, nodeValues = []) => {
            for (let i = 0; i < parent.childNodes.length; i++) {
                const child = parent.childNodes[i];

                if (child.nodeType == 3) {
                    const value = child.nodeValue;

                    if (anchorNode === child) {
                        positions.anchor = nodeValues.join('').length + anchorOffset;
                    }

                    if (focusNode === child) {
                        positions.focus = nodeValues.join('').length + focusOffset;
                    }

                    if (positions.anchor && positions.focus) {
                        break;
                    }

                    nodeValues.push(value);
                } else {
                    positions = find(child, positions, nodeValues);

                    // Add extra whitespace if current element is a block element
                    if (window.getComputedStyle(child, null).getPropertyValue('display') === 'block') {
                        nodeValues.push(' ');
                    }
                }
            }

            return positions;
        };

        caretPosition = find(editorContent, { anchor: null, focus: null });

        return caretPosition;
    };

    const setCaretPosition = (focusIndex = null, anchorIndex = null) => {
        // Fill empty arguments
        if (focusIndex !== null && anchorIndex === null) {
            anchorIndex = focusIndex;
        } else if (focusIndex === null) {
            focusIndex = caretPosition.focus;
            anchorIndex = caretPosition.anchor;
        }
        
        const find = (parent, positions, nodeValues = []) => {
            for (let i = 0; i < parent.childNodes.length; i++) {
                const child = parent.childNodes[i];

                if (child.nodeType == 3) {
                    const value = child.nodeValue;
                    const nextNodeValueLength = [...nodeValues, value].join('').length;

                    if (!positions.focus && focusIndex <= nextNodeValueLength) {
                        positions.focus = {
                            node: child,
                            offset: focusIndex - nodeValues.join('').length
                        };
                    }

                    if (!positions.anchor && anchorIndex <= nextNodeValueLength) {
                        positions.anchor = {
                            node: child,
                            offset: anchorIndex - nodeValues.join('').length
                        };
                    }

                    if (positions.anchor && positions.focus) {
                        break;
                    }
                    
                    nodeValues.push(value);

                } else {
                    positions = find(child, positions, nodeValues);

                    // Add extra whitespace if current element is a block element
                    if (window.getComputedStyle(child, null).getPropertyValue('display') === 'block') {
                        nodeValues.push(' ');
                    }
                }
            }

            return positions;
        };
        
        const positions = (find(editorContent, { anchor: null, focus: null }));

        let range = document.createRange();
        let selection = window.getSelection();

        range.setEnd(positions.focus.node, positions.focus.offset);
        range.setStart(positions.anchor.node, positions.anchor.offset);

        selection.removeAllRanges();
        selection.addRange(range);
    }

    const deleteSelected = () => {
        let firstCaret = Math.min(caretPosition.anchor, caretPosition.focus);
        let lastCaret = Math.max(caretPosition.anchor, caretPosition.focus);

        let position = 0;

        let firstPosition;
        let lastPosition;

        let firstBlock;
        let lastBlock;

        for (let i = 0; i < blocks.length; i++) {
            if (i > 0) {
                position++;
            }

            const block = blocks[i];
            for (let x = 0; x < block.nodes.length; x++) {
                const node = block.nodes[x];
                position += node.value.length;

                let firstCaretInNode = false;
                let lastCaretInNode = false;

                if (firstPosition == null && position >= firstCaret) {
                    firstBlock = i;
                    firstCaretInNode = true;
                    firstPosition = firstCaret - (position - node.value.length);
                }

                if (lastPosition == null && position >= lastCaret) {
                    lastBlock = i;
                    lastCaretInNode = true;
                    lastPosition = lastCaret - (position - node.value.length);
                }

                if (firstPosition != null) {
                    if (firstCaretInNode && lastCaretInNode) {
                        node.value = node.value.slice(0, firstPosition) + node.value.slice(lastPosition);
                    } else if (firstCaretInNode && !lastCaretInNode) {
                        node.value = node.value.slice(0, firstPosition);
                    } else if (!firstCaretInNode && lastCaretInNode) {
                        node.value = node.value.slice(lastPosition);
                    } else if (!firstCaretInNode && !lastCaretInNode) {
                        block.nodes.splice(x, 1);
                        x--;
                    }
                }

                if (lastCaretInNode) {
                    i = blocks.length;

                    for (let y = firstBlock + 1; y < lastBlock; y++) {
                        blocks.splice(y, 1);
                        lastBlock--;
                    }

                    if (!(firstCaretInNode && lastCaretInNode)) {
                        blocks[firstBlock].nodes = [...blocks[firstBlock].nodes, ...blocks[lastBlock].nodes];
                        blocks.splice(lastBlock, 1);
                    }

                    break;
                }
            }
        }
    };

    const insertText = (index, value) => {
        const { node, position } = getCaretPositionInfo(index);
        node.value = node.value.slice(0, position) + value + node.value.slice(position);
    };

    const getCaretPositionInfo = (index) => {
        let position = 0;

        for (let i = 0; i < blocks.length; i++) {
            let block = blocks[i];

            for (let x = 0; x < block.nodes.length; x++) {
                const node = block.nodes[x];
                const nodeLength = node.value.length;
                position += nodeLength;

                if (position >= index) {
                    position -= nodeLength;
                    position = index - position;

                    return {
                        position,
                        block,
                        blockIndex: i,
                        node,
                        nodeIndex: x
                    };
                }
            }

            position++;
        }
    };

    const deleteContentBackward = () => {
        const { node, position } = getCaretPositionInfo(caretPosition.focus - 1);

        node.value = node.value.slice(0, position) + node.value.slice(position + 1);
    };

    const deleteContentForward = () => {
        const { node, position } = getCaretPositionInfo(caretPosition.focus);

        node.value = node.value.slice(0, position) + node.value.slice(position + 1);
    };

    const parseBlocks = (content = false) => {
        if (!content) {
            content = editorContent;
        }

        blocks = [];

        [...content.children].forEach((child) => {
            blocks.push({
                type: child.nodeName,
                nodes: parseNodes(child)
            });
        });
    };

    const equalArrays = (first = [], second = []) => first.sort().toString() === second.sort().toString();

    const parseNodes = (node) => {
        const nodes = [];

        const findNodes = (parent, types = []) => {
            parent.childNodes.forEach((child) => {
                if (child.nodeType == 3) {
                    const value = child.nodeValue;

                    if (nodes[nodes.length - 1] && equalArrays(types, nodes[nodes.length - 1].types)) {
                        nodes[nodes.length - 1].value += value;
                    } else {
                        nodes.push({
                            //element: child,
                            types: types,
                            value: value
                        });
                    }
                } else {
                    findNodes(child, [...types, child.nodeName]);
                }
            });
        };

        findNodes(node);

        if (nodes.length === 0) {
            const textNode = document.createTextNode('');
            node.append(textNode);

            nodes.push({
                //element: textNode,
                types: [],
                value: ''
            });
        }

        return nodes;
    };

    const getEditorContent = (value) => {
        return editorContent.innerHTML;
    };

    const setEditorContent = (value) => {
        editorContent.innerHTML = value;
        parseBlocks();
    };

    const createEditor = () => {
        editor = document.createElement('div');

        editorContent = document.createElement('div');
        editorContent.contentEditable = true;
        editorContent.style.whiteSpace = 'break-spaces';
        editor.append(editorContent);

        element.parentElement.insertBefore(editor, element);

        const container = document.createElement('div');
        container.innerHTML = value;

        parseBlocks(container);
        setEditorContent(buildHtml());
    };

    createEditor();

    editorContent.onkeydown = (e) => {
        getCaretPosition();
    };

    editorContent.oninput = (e) => {
        let isCollapsed = caretPosition.anchor == caretPosition.focus;
        let newCaretPosition = Math.min(caretPosition.anchor, caretPosition.focus);

        if (e.inputType === 'insertText') {
            if (!isCollapsed) {
                deleteSelected();
            }

            insertText(newCaretPosition, e.data);
            newCaretPosition += e.data.length;
        } else if (e.inputType === 'insertParagraph') {
            if (!isCollapsed) {
                deleteSelected();
            }

            let { position, node, nodeIndex, block, blockIndex } = getCaretPositionInfo(newCaretPosition);

            let firstNode = { ...node };
            let lastNode = { ...node };

            let firstBlockNodes = block.nodes.filter((blockNode, index) => index < nodeIndex);
            let lastBlockNodes = block.nodes.filter((blockNode, index) => nodeIndex < index);

            firstNode.value = firstNode.value.slice(0, position);
            lastNode.value = lastNode.value.slice(position);

            firstBlockNodes.push(firstNode);
            lastBlockNodes.unshift(lastNode);

            let firstBlock = { ...block, nodes: firstBlockNodes };
            let lastBlock = { ...block, nodes: lastBlockNodes };

            blocks.splice(blockIndex, 1, lastBlock);
            blocks.splice(blockIndex, 0, firstBlock);

            newCaretPosition = newCaretPosition + 1;
        } else if (e.inputType === 'insertLineBreak') {
        } else if (e.inputType === 'deleteContentBackward') {
            if (isCollapsed) {
                let { block: firstCaretInNode } = getCaretPositionInfo(caretPosition.focus - 1);
                let { block: lastCaretInNode } = getCaretPositionInfo(caretPosition.focus);

                deleteContentBackward();
                newCaretPosition = caretPosition.focus - 1;

                if (firstCaretInNode != lastCaretInNode) {
                    firstCaretInNode.nodes = [...firstCaretInNode.nodes, ...lastCaretInNode.nodes];
                    blocks = blocks.filter((block) => block != lastCaretInNode);
                }
            } else {
                deleteSelected();
            }
        } else if (e.inputType === 'deleteContentForward') {
            if (isCollapsed) {
                let { block: firstCaretInNode } = getCaretPositionInfo(caretPosition.focus);
                let { block: lastCaretInNode } = getCaretPositionInfo(caretPosition.focus + 1);

                deleteContentForward();
                newCaretPosition = caretPosition.focus;

                if (firstCaretInNode != lastCaretInNode) {
                    firstCaretInNode.nodes = [...firstCaretInNode.nodes, ...lastCaretInNode.nodes];
                    blocks = blocks.filter((block) => block != lastCaretInNode);
                }
            } else {
                deleteSelected();
            }
        } else if (e.inputType === 'insertFromPaste') {
        }

        setEditorContent(buildHtml());
        setCaretPosition(newCaretPosition);
    };
};
