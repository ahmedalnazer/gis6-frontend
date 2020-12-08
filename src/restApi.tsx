

const BACKEND_URL: string = "http://192.168.22.54:8000"

export async function fetchJson(path:string, options?:any) {
	const url = `${BACKEND_URL}${path}`;

	const response = await fetch(url, options);
	if(!response.ok) {
		throw new Error(`Response not OK: ${response.status}`);
	}
	return await response.json();
}

export async function sendJson(method:string, path:string, payload:any = {}) {
	const url = `${BACKEND_URL}${path}`;

	const response = await fetch(url, {
		method: method,
		body: JSON.stringify(payload),
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json"
		}
	});

	if(!response.ok) {
		throw new Error(`Response not OK: ${response.status}`);
	}
	return await response.json();
}