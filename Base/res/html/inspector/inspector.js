let selectedTopTab = null;
let selectedTopTabButton = null;

let selectedBottomTab = null;
let selectedBottomTabButton = null;

let selectedDOMNode = null;

let consoleGroupStack = [];
let consoleGroupNextID = 0;

let consoleHistory = [];
let consoleHistoryIndex = 0;

const selectTab = (tabButton, tabID, selectedTab, selectedTabButton) => {
    let tab = document.getElementById(tabID);

    if (selectedTab === tab) {
        return selectedTab;
    }
    if (selectedTab !== null) {
        selectedTab.style.display = "none";
        selectedTabButton.classList.remove("active");
    }

    tab.style.display = "block";
    tabButton.classList.add("active");

    return tab;
};

const selectTopTab = (tabButton, tabID) => {
    selectedTopTab = selectTab(tabButton, tabID, selectedTopTab, selectedTopTabButton);
    selectedTopTabButton = tabButton;
};

const selectBottomTab = (tabButton, tabID) => {
    selectedBottomTab = selectTab(tabButton, tabID, selectedBottomTab, selectedBottomTabButton);
    selectedBottomTabButton = tabButton;
};

let initialTopTabButton = document.getElementById("dom-tree-button");
selectTopTab(initialTopTabButton, "dom-tree");

let initialBottomTabButton = document.getElementById("console-button");
selectBottomTab(initialBottomTabButton, "console");

const scrollToElement = element => {
    // Include an offset to prevent the element being placed behind the fixed `tab-controls` header.
    const offset = 45;

    let position = element.getBoundingClientRect().top;
    position += window.pageYOffset - offset;

    window.scrollTo(0, position);
};

inspector.loadDOMTree = tree => {
    let domTree = document.getElementById("dom-tree");
    domTree.innerHTML = atob(tree);

    let domNodes = domTree.querySelectorAll(".hoverable");

    for (let domNode of domNodes) {
        domNode.addEventListener("click", event => {
            inspectDOMNode(domNode);
            event.preventDefault();
        });
    }
};

inspector.loadAccessibilityTree = tree => {
    let accessibilityTree = document.getElementById("accessibility-tree");
    accessibilityTree.innerHTML = atob(tree);
};

inspector.inspectDOMNodeID = nodeID => {
    let domNodes = document.querySelectorAll(`[data-id="${nodeID}"]`);
    if (domNodes.length !== 1) {
        return;
    }

    for (let domNode = domNodes[0]; domNode; domNode = domNode.parentNode) {
        if (domNode.tagName === "DETAILS") {
            domNode.setAttribute("open", "");
        }
    }

    inspectDOMNode(domNodes[0]);
    scrollToElement(selectedDOMNode);
};

inspector.clearInspectedDOMNode = () => {
    if (selectedDOMNode !== null) {
        selectedDOMNode.classList.remove("selected");
        selectedDOMNode = null;
    }
};

inspector.createPropertyTables = (computedStyle, resolvedStyle, customProperties) => {
    const createPropertyTable = (tableID, properties) => {
        let oldTable = document.getElementById(tableID);

        let newTable = document.createElement("tbody");
        newTable.setAttribute("id", tableID);

        Object.keys(properties)
            .sort()
            .forEach(name => {
                let row = newTable.insertRow();

                let nameColumn = row.insertCell();
                nameColumn.innerText = name;

                let valueColumn = row.insertCell();
                valueColumn.innerText = properties[name];
            });

        oldTable.parentNode.replaceChild(newTable, oldTable);
    };

    createPropertyTable("computed-style-table", JSON.parse(computedStyle));
    createPropertyTable("resolved-style-table", JSON.parse(resolvedStyle));
    createPropertyTable("custom-properties-table", JSON.parse(customProperties));
};

const inspectDOMNode = domNode => {
    if (selectedDOMNode === domNode) {
        return;
    }

    inspector.clearInspectedDOMNode();

    domNode.classList.add("selected");
    selectedDOMNode = domNode;

    inspector.inspectDOMNode(domNode.dataset.id, domNode.dataset.pseudoElement);
};

const executeConsoleScript = consoleInput => {
    const script = consoleInput.value;

    if (!/\S/.test(script)) {
        return;
    }

    if (consoleHistory.length === 0 || consoleHistory[consoleHistory.length - 1] !== script) {
        consoleHistory.push(script);
    }

    consoleHistoryIndex = consoleHistory.length;

    inspector.executeConsoleScript(script);
    consoleInput.value = "";
};

const setConsoleInputToPreviousHistoryItem = consoleInput => {
    if (consoleHistoryIndex === 0) {
        return;
    }

    --consoleHistoryIndex;

    const script = consoleHistory[consoleHistoryIndex];
    consoleInput.value = script;
};

const setConsoleInputToNextHistoryItem = consoleInput => {
    if (consoleHistory.length === 0) {
        return;
    }

    const lastIndex = consoleHistory.length - 1;

    if (consoleHistoryIndex < lastIndex) {
        ++consoleHistoryIndex;

        consoleInput.value = consoleHistory[consoleHistoryIndex];
        return;
    }

    if (consoleHistoryIndex === lastIndex) {
        ++consoleHistoryIndex;

        consoleInput.value = "";
        return;
    }
};

const consoleParentGroup = () => {
    if (consoleGroupStack.length === 0) {
        return document.getElementById("console-output");
    }

    const lastConsoleGroup = consoleGroupStack[consoleGroupStack.length - 1];
    return document.getElementById(`console-group-${lastConsoleGroup.id}`);
};

const scrollConsoleToBottom = () => {
    let consoleOutput = document.getElementById("console-output");

    // FIXME: It should be sufficient to scrollTo a y value of document.documentElement.offsetHeight,
    //        but due to an unknown bug offsetHeight seems to not be properly updated after spamming
    //        a lot of document changes.
    //
    // The setTimeout makes the scrollTo async and allows the DOM to be updated.
    setTimeout(function () {
        consoleOutput.scrollTo(0, 1_000_000_000);
    }, 0);
};

inspector.appendConsoleOutput = output => {
    let parent = consoleParentGroup();

    let element = document.createElement("p");
    element.innerHTML = atob(output);

    parent.appendChild(element);
    scrollConsoleToBottom();
};

inspector.clearConsoleOutput = () => {
    let consoleOutput = document.getElementById("console-output");
    consoleOutput.innerHTML = "";

    consoleGroupStack = [];
};

inspector.beginConsoleGroup = (label, startExpanded) => {
    let parent = consoleParentGroup();

    const group = {
        id: ++consoleGroupNextID,
        label: label,
    };
    consoleGroupStack.push(group);

    let details = document.createElement("details");
    details.id = `console-group-${group.id}`;
    details.open = startExpanded;

    let summary = document.createElement("summary");
    summary.innerHTML = atob(label);

    details.appendChild(summary);
    parent.appendChild(details);
    scrollConsoleToBottom();
};

inspector.endConsoleGroup = () => {
    consoleGroupStack.pop();
};

document.addEventListener("DOMContentLoaded", () => {
    let consoleInput = document.getElementById("console-input");
    consoleInput.focus();

    consoleInput.addEventListener("keydown", event => {
        const UP_ARROW_KEYCODE = 38;
        const DOWN_ARROW_KEYCODE = 40;
        const RETURN_KEYCODE = 13;

        if (event.keyCode === UP_ARROW_KEYCODE) {
            setConsoleInputToPreviousHistoryItem(consoleInput);
            event.preventDefault();
        } else if (event.keyCode === DOWN_ARROW_KEYCODE) {
            setConsoleInputToNextHistoryItem(consoleInput);
            event.preventDefault();
        } else if (event.keyCode === RETURN_KEYCODE) {
            executeConsoleScript(consoleInput);
            event.preventDefault();
        }
    });

    inspector.inspectorLoaded();
});
