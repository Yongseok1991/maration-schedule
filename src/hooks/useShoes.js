import { useState, useEffect, useCallback } from "react";
import { dataService } from "../services/dataService";

const normalizeShoe = (shoe = {}) => ({
  shoeId: shoe.shoeId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
  name: shoe.name || "",
  price: typeof shoe.price === "string" ? shoe.price : "",
  purchaseDate: typeof shoe.purchaseDate === "string" ? shoe.purchaseDate : "",
  distanceKm: typeof shoe.distanceKm === "string" ? shoe.distanceKm : "",
  memo: shoe.memo || ""
});

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
      setShoes([]);
      setLoading(false);
      return;
    }
    try {
      const data = await dataService.getShoes(user.id);
      setShoes(data.map(normalizeShoe));
    } catch (err) {
      console.error("Failed to load shoes:", err);
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
    if (!user) return { needAuth: true };
    const name = shoeForm.name.trim();
    if (!name) return { error: "러닝화 이름을 입력해주세요." };

    const newShoe = normalizeShoe({ ...shoeForm, name });
    setShoes((prev) => [newShoe, ...prev]);
    setShoeForm({ name: "", price: "", purchaseDate: "", distanceKm: "", memo: "" });

    try {
      await dataService.saveShoe(newShoe, user.id);
      return { success: true };
    } catch (err) {
      console.error("Add shoe error:", err);
      return { success: false, error: err };
    }
  };

  const updateShoe = async (shoeId, patch) => {
    if (!user) return;
    const target = shoes.find((s) => s.shoeId === shoeId);
    if (!target) return;
    const updated = { ...target, ...patch };
    setShoes((prev) => prev.map((s) => (s.shoeId === shoeId ? updated : s)));

    try {
      await dataService.saveShoe(updated, user.id);
    } catch (err) {
      console.error("Update shoe error:", err);
    }
  };

  const removeShoe = async (shoeId) => {
    if (!user) return;
    setShoes((prev) => prev.filter((s) => s.shoeId !== shoeId));
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
