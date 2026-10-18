import React, {createContext, useCallback, useContext, useState} from 'react';
import {AppText, Button, Sheet} from '../../design/ui';
type Request = {title: string; action: () => void};
type Confirm = (title: string, action: () => void) => void;
const context = createContext<Confirm | null>(null);
export function useConfirmReset() {
  const confirm = useContext(context);
  if (!confirm) throw new Error('missing_reset_confirmation_provider');
  return confirm;
}
export function ResetConfirmationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [request, setRequest] = useState<Request | null>(null);
  const confirm = useCallback<Confirm>(
    (title, action) => setRequest(current => current ?? {title, action}),
    [],
  );
  // Confirmation is scoped to this app mount. Activity recreation cancels it;
  // it cannot retain a callback into a previous counter provider.
  const close = () => setRequest(null);
  return (
    <context.Provider value={confirm}>
      {children}
      <Sheet title={request?.title ?? ''} visible={!!request} onClose={close}>
        <AppText>
          ستعود العدادات المحددة إلى القيم الأصلية. لن تتغير المحفوظات أو
          التنزيلات.
        </AppText>
        <Button
          label="إعادة"
          onPress={() => {
            const action = request?.action;
            close();
            action?.();
          }}
        />
        <Button secondary label="إلغاء" onPress={close} />
      </Sheet>
    </context.Provider>
  );
}
