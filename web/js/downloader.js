import { app } from "../../../scripts/app.js";
import { DownloaderUI } from "./UI.js";

console.log("Loading ComfyUI-Downloader...");

// --- Configuration ---
const EXTENSION_NAME = "ComfyUI-Downloader";
const API_PREFIX = "35b631e00fa2dbc173ee4a5f899cba8f";
const CSS_URL = `/${API_PREFIX}/extensions/ComfyUI-Downloader/css/downloader.css`;
const USE_FLOATING_BUTTON = false;
const FLOAT_POS_STORAGE_KEY = `${EXTENSION_NAME}.floatingButtonPos`;

// Load CSS
function loadCSS() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = CSS_URL;
    document.head.appendChild(link);
}

// Add Menu Button to ComfyUI
let retryCount = 0;
const MAX_RETRIES = 10;

async function openDownloaderModal() {
    if (!window.downloaderUI) {
        console.info(`[${EXTENSION_NAME}] Creating DownloaderUI instance...`);
        window.downloaderUI = new DownloaderUI();

        try {
            await window.downloaderUI.initializeUI();
            console.info(`[${EXTENSION_NAME}] UI Initialization complete.`);
        } catch (error) {
            console.error(`[${EXTENSION_NAME}] Error during UI initialization:`, error);
        }
    }

    if (window.downloaderUI) {
        window.downloaderUI.openModal();
    } else {
        console.error(`[${EXTENSION_NAME}] Cannot open modal: UI instance not available.`);
        alert("Downloader failed to initialize. Please check the browser console for errors.");
    }
}

function addMenuButton() {
    const buttonGroup = document.querySelector(".comfyui-button-group");

    if (!buttonGroup) {
        retryCount++;
        if (retryCount < MAX_RETRIES) {
            console.warn(`[${EXTENSION_NAME}] ComfyUI button group not found. Retrying... (${retryCount}/${MAX_RETRIES})`);
            setTimeout(addMenuButton, 500);
            return;
        } else {
            console.warn(`[${EXTENSION_NAME}] Button group not found after ${MAX_RETRIES} attempts. Creating button in absolute position.`);
            createAbsolutePositionButton();
            return;
        }
    }

    if (document.getElementById("downloader-button")) {
        console.log(`[${EXTENSION_NAME}] Button already exists.`);
        return;
    }

    const downloaderButton = document.createElement("button");
    downloaderButton.textContent = "Downloader";
    downloaderButton.id = "downloader-button";
    downloaderButton.title = "Open Downloader";
    downloaderButton.style.margin = "0 5px";

    downloaderButton.onclick = openDownloaderModal;
    
    const managerButton =
        buttonGroup.querySelector("#comfyui-manager-button, #cm-button, #manager-button") ||
        Array.from(buttonGroup.querySelectorAll("button")).find(b => (b.textContent || "").trim().toLowerCase() === "manager");

    if (managerButton) {
        downloaderButton.style.marginLeft = "14px"; // Keep a visible gap from Manager.
        managerButton.insertAdjacentElement("afterend", downloaderButton);
        console.log(`[${EXTENSION_NAME}] Downloader button added next to Manager with extra spacing.`);
    } else {
        buttonGroup.appendChild(downloaderButton);
        console.log(`[${EXTENSION_NAME}] Downloader button added to .comfyui-button-group.`);
    }

    const menu = document.querySelector(".comfy-menu");
    if (!buttonGroup.contains(downloaderButton) && menu && !menu.contains(downloaderButton)) {
        console.warn(`[${EXTENSION_NAME}] Failed to append button to group, falling back to menu.`);
        const settingsButton = menu.querySelector("#comfy-settings-button");
        if (settingsButton) {
            settingsButton.insertAdjacentElement("beforebegin", downloaderButton);
        } else {
            menu.appendChild(downloaderButton);
        }
    }
}

function createAbsolutePositionButton() {
    if (document.getElementById("downloader-button")) {
        console.log(`[${EXTENSION_NAME}] Button already exists.`);
        return;
    }

    const downloaderButton = document.createElement("button");
    downloaderButton.textContent = "Downloader";
    downloaderButton.id = "downloader-button";
    downloaderButton.title = "Open Downloader";
    
    // Floating position - bottom right
    downloaderButton.style.position = "fixed";
    downloaderButton.style.left = "0px";
    downloaderButton.style.top = "0px";
    downloaderButton.style.right = "auto";
    downloaderButton.style.bottom = "auto";
    downloaderButton.style.transform = "none";
    downloaderButton.style.zIndex = "9999";
    downloaderButton.style.padding = "10px 16px";
    downloaderButton.style.backgroundColor = "#4CAF50";
    downloaderButton.style.color = "white";
    downloaderButton.style.border = "none";
    downloaderButton.style.borderRadius = "5px";
    downloaderButton.style.cursor = "grab";
    downloaderButton.style.userSelect = "none";
    downloaderButton.style.touchAction = "none";
    downloaderButton.style.boxShadow = "0 2px 5px rgba(0,0,0,0.3)";

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const getBounds = () => ({
        minX: 8,
        minY: 8,
        maxX: Math.max(8, window.innerWidth - downloaderButton.offsetWidth - 8),
        maxY: Math.max(8, window.innerHeight - downloaderButton.offsetHeight - 8),
    });

    const applyPosition = (x, y) => {
        const bounds = getBounds();
        const safeX = clamp(x, bounds.minX, bounds.maxX);
        const safeY = clamp(y, bounds.minY, bounds.maxY);
        downloaderButton.style.left = `${safeX}px`;
        downloaderButton.style.top = `${safeY}px`;
    };

    const savePosition = () => {
        const x = parseInt(downloaderButton.style.left, 10) || 0;
        const y = parseInt(downloaderButton.style.top, 10) || 0;
        localStorage.setItem(FLOAT_POS_STORAGE_KEY, JSON.stringify({ x, y }));
    };

    const getManagerButton = () => {
        const byId = document.querySelector("#comfyui-manager-button, #cm-button, #manager-button");
        if (byId) return byId;
        const candidates = Array.from(document.querySelectorAll("button"));
        return candidates.find(b => (b.textContent || "").trim().toLowerCase() === "manager") || null;
    };

    const getDefaultPosition = () => {
        const managerBtn = getManagerButton();
        if (managerBtn) {
            const rect = managerBtn.getBoundingClientRect();
            return {
                x: rect.right + 12,
                y: rect.top,
            };
        }
        return {
            x: window.innerWidth - 170,
            y: 76,
        };
    };

    const loadInitialPosition = () => {
        let loaded = false;
        const saved = localStorage.getItem(FLOAT_POS_STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (typeof parsed.x === "number" && typeof parsed.y === "number") {
                    applyPosition(parsed.x, parsed.y);
                    loaded = true;
                }
            } catch (error) {
                console.warn(`[${EXTENSION_NAME}] Failed to parse saved button position:`, error);
            }
        }
        if (!loaded) {
            const pos = getDefaultPosition();
            applyPosition(pos.x, pos.y);
        }
    };

    let isDragging = false;
    let dragMoved = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let suppressClick = false;

    downloaderButton.addEventListener("pointerdown", (event) => {
        isDragging = true;
        dragMoved = false;
        dragOffsetX = event.clientX - downloaderButton.offsetLeft;
        dragOffsetY = event.clientY - downloaderButton.offsetTop;
        downloaderButton.style.cursor = "grabbing";
        downloaderButton.setPointerCapture(event.pointerId);
    });

    downloaderButton.addEventListener("pointermove", (event) => {
        if (!isDragging) return;
        dragMoved = true;
        applyPosition(event.clientX - dragOffsetX, event.clientY - dragOffsetY);
    });

    const finishDrag = (event) => {
        if (!isDragging) return;
        isDragging = false;
        downloaderButton.style.cursor = "grab";
        if (event && downloaderButton.hasPointerCapture(event.pointerId)) {
            downloaderButton.releasePointerCapture(event.pointerId);
        }
        if (dragMoved) {
            savePosition();
            suppressClick = true;
            setTimeout(() => {
                suppressClick = false;
            }, 120);
        }
    };

    downloaderButton.addEventListener("pointerup", finishDrag);
    downloaderButton.addEventListener("pointercancel", finishDrag);

    downloaderButton.onclick = async () => {
        if (suppressClick) return;
        await openDownloaderModal();
    };

    document.body.appendChild(downloaderButton);
    requestAnimationFrame(loadInitialPosition);

    // Re-clamp position on viewport resize.
    window.addEventListener("resize", () => {
        const x = parseInt(downloaderButton.style.left, 10) || 0;
        const y = parseInt(downloaderButton.style.top, 10) || 0;
        applyPosition(x, y);
        savePosition();
    });

    console.log(`[${EXTENSION_NAME}] Downloader button added in floating draggable mode.`);
}

// --- Initialization ---
app.registerExtension({
    name: "ComfyUI-Downloader.Downloader",
    async setup(appInstance) {
        console.log(`[${EXTENSION_NAME}] Setting up Downloader Extension...`);
        loadCSS();
        if (USE_FLOATING_BUTTON) {
            createAbsolutePositionButton();
        } else {
            addMenuButton();
        }
        console.log(`[${EXTENSION_NAME}] Extension setup complete. UI will initialize on first click.`);
    },
});
