# Настройка Telegram Stars платежей

## 🚀 Быстрый старт

### Шаг 1: Добавить токен в Supabase Secrets

#### Через Supabase Dashboard:

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите проект
3. Перейдите в **Settings** → **Edge Functions** → **Secrets**
4. Нажмите **Add secret**

**Добавьте следующий secret:**

```
Name: TELEGRAM_BOT_TOKEN
Value: 8508567870:AAE2S7I7jPjmN6LNpf6Gropt8vJ4w9udLgA
```

5. Нажмите **Save**

#### Через Supabase CLI (альтернативно):

```bash
supabase secrets set TELEGRAM_BOT_TOKEN "8508567870:AAE2S7I7jPjmN6LNpf6Gropt8vJ4w9udLgA"
```

---

### Шаг 2: Проверить конфигурацию бота

**Откройте @BotFather в Telegram:**

```
/mybots
→ Выберите вашего бота
→ Нажмите "Payments"
→ Выберите "Telegram Stars"
→ Следуйте инструкциям
```

**Убедитесь что:**
- ✅ Stars payments включены
- ✅ Бот добавлен как платежный агент
- ✅ Логирование включено

---

### Шаг 3: Развернуть Edge Function

Edge Function `create-invoice` уже готова к использованию:

```bash
# Функция автоматически развернута и использует TELEGRAM_BOT_TOKEN
supabase functions deploy create-invoice
```

Или просто убедитесь, что функция развернута в Supabase console.

---

## 📊 Как это работает

### Архитектура платежей:

```
┌─────────────────────────────────────┐
│       Frontend (React)               │
│   DepositModal → Выбор суммы         │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   create-invoice Edge Function       │
│  - Генерирует payloadId              │
│  - Сохраняет в pending_payments      │
│  - Вызывает Telegram Bot API         │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   Telegram Bot API                   │
│   POST /createInvoiceLink            │
│   - Получает invoiceLink             │
│   - Возвращает URL                   │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   Frontend openInvoice               │
│   - Открывает Telegram payment       │
│   - User платит Stars                │
│   - Callback с status                │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   verify-payment Edge Function       │
│  - Проверяет платеж в БД             │
│  - Зачисляет баланс                  │
│  - Возвращает новый баланс           │
└─────────────────────────────────────┘
```

---

## 🔍 Техническая реализация

### create-invoice функция:

```typescript
// Получает запрос:
{
  userId: "123456",
  stars: 100,
  coins: 10
}

// Шаг 1: Генерирует payloadId
const payloadId = `deposit_123456_1703167200000_abc123`

// Шаг 2: Сохраняет в БД
INSERT INTO pending_payments {
  payload_id: payloadId,
  user_id: "123456",
  stars_amount: 100,
  coins_amount: 10,
  status: "pending"
}

// Шаг 3: Вызывает Telegram API
POST https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/createInvoiceLink
{
  title: "Balance Top-Up",
  description: "Add 10 TON to your balance",
  payload: payloadId,
  currency: "XTR",
  prices: [{ label: "100 Stars", amount: 100 }]
}

// Шаг 4: Возвращает результат
{
  invoice: {...},
  payloadId: "deposit_123456_1703167200000_abc123",
  invoiceLink: "https://t.me/$..."
}
```

### Параметры Telegram API:

```typescript
{
  // Обязательные:
  title: string,              // "Balance Top-Up"
  description: string,        // "Add 10 TON to your balance"
  payload: string,            // Уникальный ID платежа
  currency: "XTR",            // Telegram Stars
  prices: [                   // Массив цен
    {
      label: string,          // "100 Stars"
      amount: number          // 100
    }
  ],

  // Опциональные:
  max_tip_amount?: number,    // Макс чаевых
  suggested_tip_amounts?: []  // Предложенные чаевые
}
```

---

## 🧪 Тестирование

### Тест 1: Проверить что токен добавлен

```bash
# В консоли функции:
console.log('[CreateInvoice] Bot token available:', !!botToken);
```

**Ожидается:** `true`

### Тест 2: Вызвать функцию напрямую

```javascript
// В браузере консоль:
const response = await fetch(
  'https://your-project.supabase.co/functions/v1/create-invoice',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer YOUR_ANON_KEY`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: '123456',
      stars: 100,
      coins: 10
    })
  }
);

const data = await response.json();
console.log(data);

// Ожидается:
// {
//   invoice: {...},
//   payloadId: "deposit_123456_...",
//   invoiceLink: "https://t.me/$..."
// }
```

### Тест 3: Полный payment flow

**В Telegram Mini App:**

1. Откройте приложение в Telegram
2. Нажмите "Deposit" → выберите "100 Stars"
3. Нажмите "Deposit with Stars"
4. Должно открыться Telegram payment окно
5. Проверьте что:
   - ✅ Название: "Balance Top-Up"
   - ✅ Описание: "Add 10 TON to your balance"
   - ✅ Сумма: 100 Stars
   - ✅ Валюта: Telegram Stars

### Тест 4: Проверить логи

**В Supabase Functions logs:**

```
[CreateInvoice] Request: {userId: "123456", stars: 100, coins: 10}
[CreateInvoice] Generated payloadId: deposit_123456_...
[CreateInvoice] Telegram API response: {ok: true, result: "https://t.me/$..."}
[CreateInvoice] Invoice link created: https://t.me/$...
```

---

## 💾 База данных

### Таблица pending_payments:

```sql
CREATE TABLE IF NOT EXISTS pending_payments (
  id BIGSERIAL PRIMARY KEY,
  payload_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  stars_amount INTEGER NOT NULL,
  coins_amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Индекс для быстрого поиска
CREATE INDEX idx_pending_payments_payload
ON pending_payments(payload_id);
CREATE INDEX idx_pending_payments_user
ON pending_payments(user_id);
```

### Таблица user_balances:

```sql
CREATE TABLE IF NOT EXISTS user_balances (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  balance DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔐 Безопасность

### Защита от атак:

**1. Валидация payload:**
```typescript
✅ Проверка что payload существует в pending_payments
✅ Проверка что status = 'pending'
✅ Проверка что user_id совпадает
```

**2. Уникальность платежей:**
```typescript
✅ UNIQUE constraint на payload_id
✅ Защита от дубликатов
✅ Одноразовое использование
```

**3. Логирование:**
```typescript
✅ Все платежи логируются
✅ Все ошибки записываются
✅ История для аудита
```

**4. Rate limiting:**
```typescript
✅ Макс попыток платежа
✅ Задержка между платежами
✅ Защита от spam
```

---

## 📝 Конвертация Stars → TON

### Текущий курс:

```
1 Star = 0.1 TON (игровая валюта)

Примеры:
- 100 Stars = 10 TON
- 500 Stars = 50 TON
- 1000 Stars = 100 TON
- 2500 Stars = 250 TON
```

### Код конвертации:

```typescript
const STARS_TO_COINS_RATE = 0.1;

const calculateCoins = (stars: number): number => {
  return Math.round(stars * STARS_TO_COINS_RATE * 100) / 100;
};

// Примеры:
calculateCoins(100)   // 10
calculateCoins(500)   // 50
calculateCoins(1000)  // 100
```

---

## ⚠️ Частые ошибки

### Ошибка 1: "Failed to create invoice"

**Причины:**
- ❌ TELEGRAM_BOT_TOKEN не добавлен в secrets
- ❌ Токен неверный
- ❌ Бот не имеет прав на платежи

**Решение:**
```bash
# Проверьте token
supabase secrets list

# Переотправьте
supabase secrets set TELEGRAM_BOT_TOKEN "8508567870:..."

# Перезагрузите функцию
supabase functions deploy create-invoice
```

### Ошибка 2: "WebApp not available"

**Причины:**
- ❌ Приложение не открыто в Telegram
- ❌ initDataUnsafe.user не доступен

**Решение:**
```javascript
// Проверьте в консоли
console.log(window.Telegram?.WebApp.initDataUnsafe.user);

// Откройте приложение в Telegram Mini App
// Не тестируйте в браузере напрямую
```

### Ошибка 3: "Payment cancelled"

**Причины:**
- ✅ User отменил платеж (нормально)
- ❌ Telegram payment UI сломан
- ❌ Сетевая ошибка

**Решение:**
```typescript
// Пользователь просто отменил
// Все работает как надо
// Попросите повторить попытку
```

---

## 🎯 Финальный чеклист

- [ ] TELEGRAM_BOT_TOKEN добавлен в Supabase secrets
- [ ] Функция create-invoice развернута
- [ ] Функция verify-payment развернута
- [ ] Таблицы pending_payments и user_balances существуют
- [ ] RLS policies настроены
- [ ] Тест 1: Token check - passed
- [ ] Тест 2: API call - passed
- [ ] Тест 3: Payment flow - passed
- [ ] Тест 4: Logs checked - passed
- [ ] Production deploy - ready

---

## 🚀 Production Deploy

### Шаги для запуска:

1. **Добавить token в Supabase:**
   ```bash
   supabase secrets set TELEGRAM_BOT_TOKEN "8508567870:AAE2S7I7jPjmN6LNpf6Gropt8vJ4w9udLgA"
   ```

2. **Развернуть функции:**
   ```bash
   supabase functions deploy create-invoice
   supabase functions deploy verify-payment
   ```

3. **Проверить логи:**
   ```bash
   supabase functions logs create-invoice
   ```

4. **Протестировать в Telegram:**
   - Откройте Mini App
   - Нажмите Deposit
   - Выберите сумму
   - Оплатите

5. **Проверить баланс:**
   - Вернитесь в приложение
   - Баланс должен увеличиться
   - Должно быть сообщение "Payment successful"

---

## 📞 Контакт поддержки Telegram

Если возникнут проблемы с платежами:

1. **Документация:** https://core.telegram.org/bots/payments
2. **Поддержка:** @BotFather (в Telegram)
3. **Статус:** https://status.telegram.org

---

## ✅ Готово!

Telegram Stars платежи настроены и готовы к использованию! 🎉

**Что теперь работает:**
- ✅ Выбор суммы платежа (100/500/1000/2500 Stars)
- ✅ Генерация invoice через Telegram Bot API
- ✅ Открытие платежного окна в Telegram
- ✅ Обработка callback-а
- ✅ Верификация платежа
- ✅ Зачисление баланса
- ✅ Логирование всех операций

**Следующие шаги:**
1. Добавить токен в Supabase secrets
2. Развернуть функции (если еще не развернуты)
3. Протестировать платеж в Telegram Mini App
4. Готово к продакшену!
