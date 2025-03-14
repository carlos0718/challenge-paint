"use client";
import React, {useRef, useEffect, useState, useCallback} from "react";

const NUM_CELLS = 100;
const MOVEMENT_THRESHOLD = 5; // umbral para considerar clic vs. arrastre (en pixeles)
export default function FullscreenCanvasGrid() {
	const canvasRef = useRef(null);
	const hasMovedRef = useRef(false);
	const startPosRef = useRef({x: 0, y: 0});
	const initialCellStateRef = useRef("#fff");
	// Array de NUM_CELLS * NUM_CELLS con color por defecto
	const [cells, setCells] = useState(Array(NUM_CELLS * NUM_CELLS).fill("#fff"));
	const [color, setColor] = useState("#FF2DF1");

	// Para menú contextual
	const [menuPosition, setMenuPosition] = useState({x: 0, y: 0});
	const [showColorPicker, setShowColorPicker] = useState(false);
	const [selectedCell, setSelectedCell] = useState(null);

	// Dibujo al arrastrar
	const [isDrawing, setIsDrawing] = useState(false);

	// Dimensiones internas (en “device pixels”) del canvas
	const [canvasSize, setCanvasSize] = useState({width: 0, height: 0});
	// Tamaño de cada celda en el sistema de coordenadas interno
	const [cellWidth, setCellWidth] = useState(0);
	const [cellHeight, setCellHeight] = useState(0);

	// 1. Ajustar el tamaño real (interno) del canvas según la ventana
	const updateCanvasDimensions = useCallback(() => {
		const dpr = window.devicePixelRatio || 1;
		const w = window.innerWidth * dpr;
		const h = window.innerHeight * dpr; // 4px de margen
		console.log("Canvas size:", w, h);
		setCanvasSize({width: w, height: h});
		// Cada celda ocupará w/NUM_CELLS de ancho y h/NUM_CELLS de alto
		setCellWidth(w / NUM_CELLS);
		setCellHeight(h / 55);
	}, []);

	useEffect(() => {
		updateCanvasDimensions();
		window.addEventListener("resize", updateCanvasDimensions);
		return () => window.removeEventListener("resize", updateCanvasDimensions);
	}, [updateCanvasDimensions]);

	// 2. Redibujar la grilla completa
	const drawGrid = useCallback(
		(ctx) => {
			// Limpia el canvas
			ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

			// Recorre filas y columnas
			for (let row = 0; row < NUM_CELLS; row++) {
				for (let col = 0; col < NUM_CELLS; col++) {
					const index = row * NUM_CELLS + col;
					const cellColor = cells[index];

					ctx.fillStyle = cellColor;
					ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);

					// Dibujar bordes (opcional)
					ctx.strokeStyle = "#ccc";
					ctx.lineWidth = 2;
					ctx.strokeRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
				}
			}
		},
		[cells, cellWidth, cellHeight]
	);

	// 3. Cada vez que cambian cells o canvasSize, redibuja
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		// Ajustar tamaño interno
		canvas.width = canvasSize.width;
		canvas.height = canvasSize.height;
		// Ajustar estilo CSS para que ocupe toda la ventana sin distorsión
		canvas.style.width = window.innerWidth + "px";
		canvas.style.height = window.innerHeight + "px";

		const ctx = canvas.getContext("2d");
		drawGrid(ctx);
	}, [drawGrid, canvasSize]);

	// Función para obtener el índice de la celda según la posición del pointer
	const getCellIndex = useCallback(
		(clientX, clientY) => {
			const rect = canvasRef.current.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;

			// Convertir coords del mouse a coords internas
			const x = (clientX - rect.left) * dpr;
			const y = (clientY - rect.top) * dpr;

			const row = Math.floor(y / cellHeight);
			const col = Math.floor(x / cellWidth);

			// Asegurarnos de no salir del rango
			if (row < 0 || row >= NUM_CELLS || col < 0 || col >= NUM_CELLS) {
				return -1; // clic fuera del canvas
			}
			return row * NUM_CELLS + col;
		},
		[cellWidth, cellHeight]
	);

	// Pinta la celda en 'index' con 'newColor'
	const paintCell = useCallback((index, newColor, toggle = false) => {
		if (index < 0) return;
		setCells((prev) => {
			const newCells = [...prev];
			if (toggle) newCells[index] = newCells[index] === "#fff" ? newColor : "#fff";
			else newCells[index] = newColor;
			return newCells;
		});
	}, []);

	// onPointerDown: inicia el dibujo
	const handlePointerDown = useCallback(
		(e) => {
			if (e.button === 2) return; // Clic derecho
			setIsDrawing(true);
			hasMovedRef.current = false;
			startPosRef.current = {x: e.clientX, y: e.clientY};
			const index = getCellIndex(e.clientX, e.clientY);
			initialCellStateRef.current = cells[index];
			//paintCell(index, color);
		},
		[cells, getCellIndex]
	);

	// onPointerMove: si isDrawing es true, pinta
	const handlePointerMove = useCallback(
		(e) => {
			if (!isDrawing) return;
			const dx = e.clientX - startPosRef.current.x;
			const dy = e.clientY - startPosRef.current.y;
			if (Math.sqrt(dx * dx + dy * dy) > MOVEMENT_THRESHOLD) hasMovedRef.current = true;
			const index = getCellIndex(e.clientX, e.clientY);
			paintCell(index, color);
		},
		[isDrawing, getCellIndex, paintCell, color]
	);

	// onPointerUp: termina dibujo
	const handlePointerUp = useCallback(
		(e) => {
			setIsDrawing(false);
			const dx = e.clientX - startPosRef.current.x;
			const dy = e.clientY - startPosRef.current.y;
			const distance = Math.sqrt(dx * dx + dy * dy);
			const index = getCellIndex(e.clientX, e.clientY);
			if (distance < MOVEMENT_THRESHOLD) {
				// Es un clic simple: toggle basándonos en el estado inicial registrado en pointerDown
				// Si la celda estaba blanca, la pintamos; si estaba pintada, se despeina
				if (initialCellStateRef.current === "#fff") {
					paintCell(index, color, false);
				} else {
					paintCell(index, color, true);
				}
			}
		},
		[color, getCellIndex, paintCell]
	);

	// onContextMenu: clic derecho => menú contextual
	const handleContextMenu = useCallback(
		(e) => {
			e.preventDefault();
			const index = getCellIndex(e.clientX, e.clientY);
			setMenuPosition({x: e.clientX, y: e.clientY});
			setSelectedCell(index);
			setShowColorPicker(true);
		},
		[getCellIndex]
	);

	// Cambiar color con menú
	const handleColorSelect = (newColor) => {
		setColor(newColor);
		if (selectedCell !== null && selectedCell >= 0) {
			paintCell(selectedCell, newColor);
		}
		setShowColorPicker(false);
	};

	// Listener global pointerup
	useEffect(() => {
		const handleGlobalPointerUp = () => setIsDrawing(false);
		window.addEventListener("pointerup", handleGlobalPointerUp);
		return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
	}, []);

	return (
		<div className='relative'>
			<canvas
				ref={canvasRef}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onContextMenu={handleContextMenu}
				style={{display: "block"}}
			/>

			{/* Menú emergente para seleccionar color */}
			{showColorPicker && (
				<div
					className='absolute bg-white border border-gray-300 shadow-lg p-2'
					style={{left: menuPosition.x, top: menuPosition.y, zIndex: 1000}}
					onMouseLeave={() => setShowColorPicker(false)}
				>
					<div className='flex space-x-2'>
						<div className='w-6 h-6 cursor-pointer' style={{backgroundColor: "#FF2DF1"}} onClick={() => handleColorSelect("#FF2DF1")} />
						<div className='w-6 h-6 cursor-pointer' style={{backgroundColor: "#FF5733"}} onClick={() => handleColorSelect("#FF5733")} />
						<div className='w-6 h-6 cursor-pointer' style={{backgroundColor: "#33FF57"}} onClick={() => handleColorSelect("#33FF57")} />
						<div className='w-6 h-6 cursor-pointer' style={{backgroundColor: "#3357FF"}} onClick={() => handleColorSelect("#3357FF")} />
						<div className='w-6 h-6 cursor-pointer' style={{backgroundColor: "#FFFF33"}} onClick={() => handleColorSelect("#FFFF33")} />
					</div>
				</div>
			)}
		</div>
	);
}
