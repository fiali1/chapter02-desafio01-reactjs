import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const product = updatedCart.find(item => item.id === productId);
      const productAmount = product ? product.amount : 0;
      const updatedProductAmount = productAmount + 1;
      
      const responseStock = await api.get(`/stock/${productId}`);
      const stockAmount = responseStock.data.amount;
      
      if (stockAmount < updatedProductAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (product) {
        product.amount = updatedProductAmount;
      } else {
        const responseProduct = await api.get(`/products/${productId}`);
        const productInfo = responseProduct.data;

        updatedCart.push({
          ...productInfo,
          amount: 1,
        });
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(item => item.id === productId);
      
      if (productIndex < 0) {
        throw Error();
      } else {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const responseStock = await api.get(`/stock/${productId}`);
      const stockAmount = responseStock.data.amount;
      
      if (stockAmount < amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      
      const updatedCart = [...cart];
      const product = updatedCart.find(item => item.id === productId);

      if (product) {
        product.amount = amount;
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
