package online.knexura.moneymanager;

import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

import online.knexura.moneymanager.wakeword.WakeWordPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugin: it must be registered before super.onCreate().
        registerPlugin(WakeWordPlugin.class);
        super.onCreate(savedInstanceState);
        // Finance app: block screenshots/screen recording and hide the content in the
        // recent-apps thumbnail so balances and transactions aren't captured.
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
    }
}
