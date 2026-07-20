// Директива Next.js: этот компонент должен выполняться в браузере,
// потому что внутри есть useState и обработчики кликов.
"use client";

// Импортируем React-хук для хранения выбранного метода оплаты и состояния кнопки.
import { useState } from "react";
import { useRouter } from "next/navigation";

// Общие типы не дают компоненту принять метод оплаты неизвестной формы.
import type { PaymentMethodDto, PaymentMethodId, PaymentState } from "@/types";
import { addCourseToCart, purchaseCart } from "@/services/api";

// Props компонента выбора оплаты.
type PaymentMethodSelectorProps = {
  // Цена выбранного курса уже подготовлена для отображения.
  price: string;
  // Список методов оплаты приходит с серверной checkout-страницы.
  methods: PaymentMethodDto[];
  // Backend ID курса, который нужно оплатить.
  courseId: number;
};

// Компонент принимает цену курса и методы оплаты с родительской checkout-страницы.
export function PaymentMethodSelector({ methods, price, courseId }: PaymentMethodSelectorProps) {
  // method хранит текущий выбранный способ оплаты.
  const [method, setMethod] = useState<PaymentMethodId>(methods[0]?.id ?? "stars");

  // state хранит состояние mock-платежа.
  const [state, setState] = useState<PaymentState>("idle");

  // Находим объект выбранного способа оплаты.
  // Если по какой-то причине ничего не найдено, используем undefined-safe проверки ниже.
  const selected = methods.find((item) => item.id === method) ?? methods[0];

  // Отдельный boolean делает JSX ниже читабельнее.
  const isLoading = state === "loading";

  // Метод считается доступным только если пришел в списке и включен в данных.
  const isEnabled = selected?.enabled ?? false;

  const router = useRouter();
  const [error, setError] = useState<string>("");

  // Обработчик основной кнопки оплаты.
  const handlePayment = async () => {
    // Сразу переводим кнопку в состояние загрузки.
    setState("loading");
    setError("");

    try {
      // Убеждаемся, что выбранный курс есть в корзине, а затем выполняем mock-оплату.
      await addCourseToCart(courseId);
      await purchaseCart();
      setState("ready");
      window.setTimeout(() => {
        router.push("/profile");
      }, 900);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Оплата не удалась");
    }
  };

  // Возвращаем UI выбора способа оплаты и кнопку действия.
  return (
    // Обертка держит вертикальный ритм между списком методов и action-кнопкой.
    <div className="grid gap-4">
      {/* Сетка методов: gap-px + bg-line дают тонкие линии между карточками. */}
      <div className="grid gap-px border border-line bg-line">
        {/* map превращает массив methods в набор кнопок. */}
        {methods.map((item) => {
          // Проверяем, выбран ли текущий item.
          const isSelected = item.id === method;

          // Возвращаем кнопку конкретного способа оплаты.
          return (
            <button
              // Класс меняется по isSelected: активная карточка кислотная, обычная темная.
              className={`grid gap-3 border border-transparent p-4 text-left transition focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-acid ${
                isSelected
                  ? "border-acid bg-acid text-ink shadow-[0_0_24px_rgba(255,106,61,0.18)]"
                  : "bg-panel/95 text-white hover:border-white/18 hover:bg-white/8"
              }`}
              // key помогает React стабильно отличать элементы списка.
              key={item.id}
              // При клике выбираем метод и сбрасываем состояние платежа.
              onClick={() => {
                setMethod(item.id);
                setState("idle");
              }}
              // type="button" нужен, чтобы кнопка не пыталась отправлять форму.
              type="button"
            >
              {/* Верхняя строка карточки: название метода и бейдж. */}
              <span className="flex items-center justify-between gap-4">
                {/* Название способа оплаты. */}
                <strong className="text-sm font-black uppercase">{item.title}</strong>
                {/* Бейдж primary/soon. */}
                <span className="border border-current px-2 py-1 text-[10px] font-black uppercase">
                  {item.tag}
                </span>
              </span>
              {/* Описание способа оплаты; цвет зависит от активного состояния. */}
              <span className={isSelected ? "text-xs text-ink/72" : "text-xs text-white/50"}>
                {item.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Главная кнопка платежа. */}
      <button
        // Disabled-стили заранее показывают, что Crypto пока не работает.
        className="min-h-14 border border-acid bg-acid px-5 text-xs font-black uppercase tracking-[0.18em] text-ink transition hover:bg-transparent hover:text-acid disabled:border-white/18 disabled:bg-white/8 disabled:text-white/32"
        // Блокируем кнопку во время mock-загрузки и для выключенных методов.
        disabled={isLoading || !isEnabled}
        // Запускаем mock-платеж.
        onClick={handlePayment}
        // Не отправляем форму.
        type="button"
      >
        {/* Текст для будущих неактивных интеграций. */}
        {!isEnabled && "Gateway pending"}
        {isLoading && "Создаем платеж"}
        {state === "ready" && "Доступ открыт"}
        {state === "error" && "Повторить оплату"}
        {isEnabled && state === "idle" && `Оплатить ${price} через ${selected?.title}`}
      </button>
      {error ? <p className="text-xs font-bold text-red-300">{error}</p> : null}
    </div>
  );
}
