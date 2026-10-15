import { useState, useEffect, useCallback } from "react";
import { dataService } from "../services/dataService";

const LOCAL_STORAGE_KEY = "maraton.shoes.v1";

const normalizeShoe = (shoe = {}) => ({
  shoeId: shoe.shoeId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
  name: shoe.name || "",
  price: typeof shoe.price === "string" ? shoe.price : "",
  purchaseDate: typeof shoe.purchaseDate === "string" ? shoe.purchaseDate : "",
  distanceKm: typeof shoe.distanceKm === "string" ? shoe.distanceKm : "",
  memo: shoe.memo || ""
});

const saveToLocalStorage = (data) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to write shoes to localStorage:", err);
  }
};

export function useShoes(user, authLoading) {
  const [shoes, setShoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shoeForm, setShoeForm] = useState({
    name: "",
    price: "",
    purchaseDate: "",
    distanceKm: "",
    memo: ""
  });

  const loadShoes = useCallback(async () => {
    if (!user) {
      try {
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setShoes(parsed.map(normalizeShoe));
            setLoading(false);
            return;
          }
        }
        const res = await fetch("./user-data/my-marathons.json");
        if (res.ok) {
          const json = await res.json();
          const items = Array.isArray(json?.shoes) ? json.shoes : [];
          setShoes(items.map(normalizeShoe));
          saveToLocalStorage(items);
        }
      } catch (err) {
        console.warn("Guest shoes fallback notice:", err);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const data = await dataService.getShoes(user.id);
      setShoes(data.map(normalizeShoe));
      saveToLocalStorage(data);
    } catch (err) {
      console.error("Failed to load shoes:", err);
      try {
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (local) setShoes(JSON.parse(local).map(normalizeShoe));
      } catch {}
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadShoes();
    }
  }, [authLoading, loadShoes]);

  const addShoe = async () => {
    const name = shoeForm.name.trim();
    if (!name) return { error: "러닝화 이름을 입력해주세요." };

    const newShoe = normalizeShoe({ ...shoeForm, name });
    const next = [newShoe, ...shoes];
    setShoes(next);
    saveToLocalStorage(next);
    setShoeForm({ name: "", price: "", purchaseDate: "", distanceKm: "", memo: "" });

    if (!user) return { success: true };

    try {
      await dataService.saveShoe(newShoe, user.id);
      return { success: true };
    } catch (err) {
      console.error("Add shoe error:", err);
      return { success: false, error: err };
    }
  };

  const updateShoe = async (shoeId, patch) => {
    const target = shoes.find((s) => s.shoeId === shoeId);
    if (!target) return;
    const updated = { ...target, ...patch };
    const next = shoes.map((s) => (s.shoeId === shoeId ? updated : s));
    setShoes(next);
    saveToLocalStorage(next);

    if (!user) return;

    try {
      await dataService.saveShoe(updated, user.id);
    } catch (err) {
      console.error("Update shoe error:", err);
    }
  };

  const removeShoe = async (shoeId) => {
    const next = shoes.filter((s) => s.shoeId !== shoeId);
    setShoes(next);
    saveToLocalStorage(next);

    if (!user) return;

    try {
      await dataService.deleteShoe(shoeId, user.id);
    } catch (err) {
      console.error("Delete shoe error:", err);
    }
  };

  return {
    shoes,
    loading,
    shoeForm,
    setShoeForm,
    addShoe,
    updateShoe,
    removeShoe,
    reload: loadShoes
  };
}
