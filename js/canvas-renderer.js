// A visualização local funciona também em máquinas sem aceleração gráfica.
function createLocalRenderer(options) {
	if (new URLSearchParams(window.location.search).get('renderer') !== 'canvas') {
		try { return new THREE.WebGLRenderer(options); } catch (error) { /* Usa a alternativa local. */ }
	}
	return new SurfaceCanvasRenderer();
}

function resizeLocalGraph(renderer, camera, container, normalHeight) {
	const expanded = container.closest(':fullscreen, .local-graph-expanded');
	const width = Math.max(1, container.clientWidth);
	const height = expanded ? Math.max(200, container.clientHeight) : Math.min(normalHeight, 560);
	renderer.setSize(width, height);
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
}

function setupLocalGraphControls(container, camera, controls, renderer) {
	container.aulaZoom = function (factor) {
		const offset = camera.position.clone().sub(controls.target).multiplyScalar(1 / factor);
		if (offset.length() < 0.1 || offset.length() > camera.far * 0.8) return;
		camera.position.copy(controls.target).add(offset);
		controls.update();
	};
}

// Renderização por software para navegadores sem WebGL disponível.
function SurfaceCanvasRenderer() {
	this.domElement = document.createElement('canvas');
	const context = this.domElement.getContext('2d');
	if (!context) throw new Error('Canvas 2D indisponível');
	let background = '#ccccff';
	let previousFrame = '';
	this.setSize = function (width, height) {
		this.domElement.width = Math.max(1, Math.round(width));
		this.domElement.height = height;
		previousFrame = '';
	};
	this.setClearColor = function (color) { background = new THREE.Color(color).getStyle(); };
	this.render = function (scene, camera) {
		scene.updateMatrixWorld();
		camera.updateMatrixWorld();
		camera.matrixWorldInverse.getInverse(camera.matrixWorld);
		const objects = [];
		scene.traverseVisible(function (object) {
			if (object.visible && (object.isMesh || object.isLine || object.isLineSegments)) objects.push(object);
		});
		const frame = camera.matrixWorld.elements.join(',') + camera.projectionMatrix.elements.join(',') + objects.map(o => o.id).join(',');
		if (frame === previousFrame) return;
		previousFrame = frame;
		const width = this.domElement.width, height = this.domElement.height;
		context.fillStyle = background;
		context.fillRect(0, 0, width, height);
		const primitives = [];
		objects.forEach(function (object) {
			const geometry = object.geometry;
			const material = Array.isArray(object.material) ? object.material[0] : object.material;
			if (!geometry || !material || material.visible === false) return;
			const viewMatrix = new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse, object.matrixWorld);
			const vertices = geometry.vertices || [];
			const positions = geometry.attributes && geometry.attributes.position;
			const count = positions ? positions.count : vertices.length;
			const projected = [];
			const viewPoints = [];
			for (let i = 0; i < count; i++) {
				const point = positions ? new THREE.Vector3().fromBufferAttribute(positions, i) : vertices[i].clone();
				point.applyMatrix4(viewMatrix);
				viewPoints.push(point.clone());
				point.applyMatrix4(camera.projectionMatrix);
				projected.push({x:(point.x + 1) * width / 2, y:(1 - point.y) * height / 2, z:point.z});
			}
			const color = material.color ? material.color.getStyle() : '#888888';
			function add(indices, line, lineColor, offset) {
				let points = indices.map(i => projected[i]);
				if (line) {
					// Recorta a linha junto à câmera em vez de descartar a malha inteira.
					const clipped = indices.map(i => viewPoints[i].clone());
					for (const plane of [-camera.near * 1.001, -camera.far]) {
						const inside = p => plane === -camera.far ? p.z >= plane : p.z <= plane;
						if (!inside(clipped[0]) && !inside(clipped[1])) return;
						if (inside(clipped[0]) !== inside(clipped[1])) {
							const outside = inside(clipped[0]) ? 1 : 0;
							const other = 1 - outside;
							const t = (plane - clipped[outside].z) / (clipped[other].z - clipped[outside].z);
							clipped[outside].lerp(clipped[other], t);
						}
					}
					points = clipped.map(p => {
						p.applyMatrix4(camera.projectionMatrix);
						return {x:(p.x+1)*width/2, y:(1-p.y)*height/2, z:p.z};
					});
				}
				if (points.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.z < -1 || p.z > 1)) return;
				primitives.push({points:points, depth:points.reduce((sum,p) => sum+p.z,0)/points.length + (offset || 0), color:lineColor || color, line:line});
			}
			if (object.isMesh) {
				if (geometry.faces) geometry.faces.forEach(f => add([f.a,f.b,f.c],false));
				else {
					const index = geometry.index;
					for (let i=0; i<(index ? index.count : count); i+=3) add(index ? [index.getX(i),index.getX(i+1),index.getX(i+2)] : [i,i+1,i+2],false);
				}
				// Reproduz as linhas da textura quadrada também no modo compatível.
				const uv = geometry.attributes && geometry.attributes.uv;
				if (uv && material.map && geometry.index) {
					const edges = new Set();
					const repeat = material.map.repeat;
					for (let i=0; i<geometry.index.count; i+=3) {
						const triangle = [0,1,2].map(j => geometry.index.getX(i+j));
						for (let j=0; j<3; j++) {
							const a=triangle[j], b=triangle[(j+1)%3];
							const onU=Math.abs(uv.getX(a)-uv.getX(b))<1e-6 && Math.abs(uv.getX(a)*repeat.x-Math.round(uv.getX(a)*repeat.x))<1e-6;
							const onV=Math.abs(uv.getY(a)-uv.getY(b))<1e-6 && Math.abs(uv.getY(a)*repeat.y-Math.round(uv.getY(a)*repeat.y))<1e-6;
							const key=Math.min(a,b)+':'+Math.max(a,b);
							if ((onU || onV) && !edges.has(key)) { edges.add(key); add([a,b],true,'#9b681c',-0.000002); }
						}
					}
				}
			} else {
				const colors = geometry.attributes && geometry.attributes.color;
				for (let i=0; i<count-1; i+=object.isLineSegments ? 2 : 1) {
					const lineColor = colors ? new THREE.Color().fromArray(colors.array,i*3).getStyle() : color;
					add([i,i+1],true,lineColor);
				}
			}
		});
		primitives.sort((a,b) => b.depth-a.depth);
		primitives.forEach(function (primitive) {
			context.beginPath();
			primitive.points.forEach((p,i) => i ? context.lineTo(p.x,p.y) : context.moveTo(p.x,p.y));
			context.strokeStyle = primitive.color;
			context.fillStyle = primitive.color;
			context.lineWidth = primitive.line ? 0.5 : 0.6;
			if (!primitive.line) { context.closePath(); context.fill(); }
			context.stroke();
		});
	};
}
