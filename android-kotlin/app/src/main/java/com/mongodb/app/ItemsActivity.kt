package com.mongodb.app

import android.app.AlertDialog
import android.content.Intent
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.EditText
import androidx.recyclerview.widget.DividerItemDecoration
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.FloatingActionButton
import io.realm.Realm
import io.realm.kotlin.where
import io.realm.mongodb.User
import io.realm.mongodb.sync.SyncConfiguration

class ItemsActivity : AppCompatActivity() {
    private lateinit var logoutButton: Button
    private lateinit var fab: FloatingActionButton
    private lateinit var adapter: ItemAdapter
    private lateinit var recyclerView: RecyclerView
    private var userRealm: Realm? = null

    override fun onStart() {
        super.onStart()
        val user = realmApp.currentUser()
        if (user == null) {
            // if no user is currently logged in, start the login activity so the user can authenticate
            startActivity(Intent(this, LoginActivity::class.java))
        }
        else {
            // get the partition value and name of the project we are currently viewing
            val partition = realmApp.currentUser().toString()

            // Initialize a connection to a realm containing all of the Items in this project
            val config = SyncConfiguration.Builder(user!!, partition).build()

            // Sync all realm changes via a new instance, and when that instance has been successfully created connect it to an on-screen list (a recycler view)
            Realm.getInstanceAsync(config, object: Realm.Callback() {
                override fun onSuccess(realm: Realm) {
                    // since this realm should live exactly as long as this activity, assign the realm to a member variable
                    this@ItemsActivity.userRealm = realm
                    setUpRecyclerView(realm, realmApp.currentUser(), partition)
                }
            })
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_items)
        if (realmApp.currentUser() == null) {
            startActivity(Intent(this, LoginActivity::class.java))
        }
        logoutButton = findViewById(R.id.button_log_out)
        logoutButton.setOnClickListener { (logOut()) }

        fab = findViewById(R.id.floating_action_button)
        fab.isEnabled = true
        fab.setOnClickListener { (addItem()) }

        recyclerView = findViewById(R.id.items_list)
    }

    /**
     *  Logs out the user and brings them back to the login screen.
     */
    private fun logOut() {
        // while this operation completes, disable the button to logout
        logoutButton.isEnabled = false
        realmApp.currentUser()?.logOutAsync {
            // re-enable the button after user registration returns a result
            logoutButton.isEnabled = true
            if (it.isSuccess) {
                realmApp.removeUser(realmApp.currentUser())
                Log.v(TAG(), "user logged out")
                startActivity(Intent(this, LoginActivity::class.java))
            } else {
                Log.e(TAG(), "log out failed! Error: ${it.error}")
            }
        }
    }

    /**
     *  Allows the user to insert an item into the realm.
     */
    private fun addItem() {
        // Create a dialog to enter an item name.
        val input = EditText(this)
        val dialogBuilder = AlertDialog.Builder(this)
        dialogBuilder.setMessage("Enter item name:")
                .setCancelable(true)
                .setPositiveButton("Create") { dialog, _ ->
                    run {
                        dialog.dismiss()
                        // Add a new item to the list by inserting into the realm.
                        val item = Item(input.text.toString())
                        // All realm writes need to occur inside of a transaction.
                        userRealm?.executeTransactionAsync { realm ->
                            realm.insert(item)
                        }
                    }
                }
                .setNegativeButton("Cancel") { dialog, _ ->
                    dialog.cancel()
                }
        val dialog = dialogBuilder.create()
        dialog.setView(input)
        dialog.setTitle("Add Item")
        dialog.show()
    }

    private fun setUpRecyclerView(realm: Realm, user: User?, partition: String) {
        // Realm provides RealmRecyclerViewAdapter, which you can extend to customize for your application.
        // Query the realm for Item objects, sorted by a stable order that remains consistent between runs, and pass the collection to the adapter.
        adapter = ItemAdapter(realm.where<Item>().sort("_id").findAll(), user!!, partition)
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter
        recyclerView.setHasFixedSize(true)
        recyclerView.addItemDecoration(DividerItemDecoration(this, DividerItemDecoration.VERTICAL))
    }
}
