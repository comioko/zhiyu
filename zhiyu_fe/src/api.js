const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getHello() {
    const res = await fetch(`${API_BASE_URL}/api/v1/login`);

    if (!res.ok) {
        throw new Error("请求失败");
    }

    return await res.json();
}
